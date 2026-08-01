use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Create app_schema ENUM
        manager.create_type(
            Type::create()
                .as_enum(Alias::new("app_schema"))
                .values(vec![
                    Alias::new("core"),
                    Alias::new("collab_crm"),
                    Alias::new("collab_ops"),
                    Alias::new("vault"),
                    Alias::new("dial"),
                    Alias::new("vista"),
                ])
                .to_owned(),
        ).await?;

        // 2. Create core.outbox table
        manager.create_table(
            Table::create()
                .table(Alias::new(("core", "outbox")))
                .if_not_exists()
                .col(ColumnDef::new(Alias::new("id")).big_serial().primary_key())
                .col(ColumnDef::new(Alias::new("schema")).enumeration(Alias::new("app_schema"), vec![
                    Alias::new("core"),
                    Alias::new("collab_crm"),
                    Alias::new("collab_ops"),
                    Alias::new("vault"),
                    Alias::new("dial"),
                    Alias::new("vista"),
                ]).not_null())
                .col(ColumnDef::new(Alias::new("event_type")).string().not_null())
                .col(ColumnDef::new(Alias::new("aggregate_id")).uuid().null())
                .col(ColumnDef::new(Alias::new("payload")).json_binary().not_null())
                .col(ColumnDef::new(Alias::new("status")).string().not_null().default("pending"))
                .col(ColumnDef::new(Alias::new("priority")).string().not_null().default("normal"))
                .col(ColumnDef::new(Alias::new("attempts")).integer().not_null().default(0))
                .col(ColumnDef::new(Alias::new("locked_until")).timestamp_with_time_zone().null())
                .col(ColumnDef::new(Alias::new("vista_consumed_at")).timestamp_with_time_zone().null())
                .col(ColumnDef::new(Alias::new("created_at")).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                .col(ColumnDef::new(Alias::new("completed_at")).timestamp_with_time_zone().null())
                .to_owned(),
        ).await?;

        // 3. Create core.idempotency_records table
        manager.create_table(
            Table::create()
                .table(Alias::new(("core", "idempotency_records")))
                .if_not_exists()
                .col(ColumnDef::new(Alias::new("command_id")).uuid().primary_key())
                .col(ColumnDef::new(Alias::new("status")).string().not_null())
                .col(ColumnDef::new(Alias::new("response_status")).small_integer().null())
                .col(ColumnDef::new(Alias::new("response_body")).json_binary().null())
                .col(ColumnDef::new(Alias::new("response_headers")).json_binary().null().default("{}"))
                .col(ColumnDef::new(Alias::new("aggregate_id")).uuid().null())
                .col(ColumnDef::new(Alias::new("created_at")).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                .col(ColumnDef::new(Alias::new("completed_at")).timestamp_with_time_zone().null())
                .to_owned(),
        ).await?;

        // 4. Create indexes for core.outbox
        manager.create_index(
            Index::create()
                .name("idx_outbox_dispatch")
                .table(Alias::new(("core", "outbox")))
                .col(Alias::new("status"))
                .col(Alias::new("locked_until"))
                .col(Alias::new("id"))
                .where_clause(Expr::col(Alias::new("status")).eq("pending"))
                .to_owned(),
        ).await?;

        manager.create_index(
            Index::create()
                .name("idx_outbox_priority")
                .table(Alias::new(("core", "outbox")))
                .col(Alias::new("priority"))
                .col(Alias::new("status"))
                .col(Alias::new("locked_until"))
                .where_clause(Expr::col(Alias::new("status")).eq("pending"))
                .to_owned(),
        ).await?;

        manager.create_index(
            Index::create()
                .name("idx_outbox_vista")
                .table(Alias::new(("core", "outbox")))
                .col(Alias::new("vista_consumed_at"))
                .col(Alias::new("status"))
                .col(Alias::new("schema"))
                .where_clause(
                    Expr::col(Alias::new("vista_consumed_at")).is_null()
                        .and(Expr::col(Alias::new("status")).is_in(["completed", "dlq"]))
                )
                .to_owned(),
        ).await?;

        // 5. RLS and Grants via raw SQL
        let sql_statements = vec![
            "ALTER TABLE core.outbox ENABLE ROW LEVEL SECURITY;",
            "GRANT INSERT ON core.outbox TO core_role;",
            "CREATE POLICY outbox_core_insert ON core.outbox FOR INSERT TO core_role WITH CHECK (schema = 'core');",
            "GRANT INSERT ON core.outbox TO cinq_role;",
            "CREATE POLICY outbox_cinq_insert ON core.outbox FOR INSERT TO cinq_role WITH CHECK (schema = 'collab_crm');",
            "GRANT INSERT ON core.outbox TO ops_role;",
            "CREATE POLICY outbox_ops_insert ON core.outbox FOR INSERT TO ops_role WITH CHECK (schema = 'collab_ops');",
            "GRANT INSERT ON core.outbox TO vault_role;",
            "CREATE POLICY outbox_vault_insert ON core.outbox FOR INSERT TO vault_role WITH CHECK (schema = 'vault');",
            "GRANT INSERT ON core.outbox TO dial_role;",
            "CREATE POLICY outbox_dial_insert ON core.outbox FOR INSERT TO dial_role WITH CHECK (schema = 'dial');",
            "GRANT INSERT ON core.outbox TO vista_role;",
            "CREATE POLICY outbox_vista_insert ON core.outbox FOR INSERT TO vista_role WITH CHECK (schema = 'vista');",
            "GRANT USAGE, SELECT ON SEQUENCE core.outbox_id_seq TO core_role, cinq_role, ops_role, vault_role, dial_role, vista_role;",
            "GRANT SELECT ON core.outbox TO dispatcher_role;",
            "GRANT UPDATE (status, attempts, locked_until, completed_at, vista_consumed_at) ON core.outbox TO dispatcher_role;",
            "CREATE POLICY outbox_dispatcher_select ON core.outbox FOR SELECT TO dispatcher_role USING (true);",
            "CREATE POLICY outbox_dispatcher_update ON core.outbox FOR UPDATE TO dispatcher_role USING (true);",
        ];

        for stmt in sql_statements {
            manager.exec_stmt(Statement::from_string(
                manager.get_database_backend(),
                stmt.to_owned(),
            )).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop policies
        let drop_policies = vec![
            "DROP POLICY IF EXISTS outbox_dispatcher_update ON core.outbox;",
            "DROP POLICY IF EXISTS outbox_dispatcher_select ON core.outbox;",
            "DROP POLICY IF EXISTS outbox_vista_insert ON core.outbox;",
            "DROP POLICY IF EXISTS outbox_dial_insert ON core.outbox;",
            "DROP POLICY IF EXISTS outbox_vault_insert ON core.outbox;",
            "DROP POLICY IF EXISTS outbox_ops_insert ON core.outbox;",
            "DROP POLICY IF EXISTS outbox_cinq_insert ON core.outbox;",
            "DROP POLICY IF EXISTS outbox_core_insert ON core.outbox;",
        ];

        for stmt in drop_policies {
            manager.exec_stmt(Statement::from_string(
                manager.get_database_backend(),
                stmt.to_owned(),
            )).await?;
        }

        // Revoke grants
        let revoke_statements = vec![
            "REVOKE UPDATE (status, attempts, locked_until, completed_at, vista_consumed_at) ON core.outbox FROM dispatcher_role;",
            "REVOKE SELECT ON core.outbox FROM dispatcher_role;",
            "REVOKE USAGE, SELECT ON SEQUENCE core.outbox_id_seq FROM core_role, cinq_role, ops_role, vault_role, dial_role, vista_role;",
            "REVOKE INSERT ON core.outbox FROM vista_role, dial_role, vault_role, ops_role, cinq_role, core_role;",
        ];

        for stmt in revoke_statements {
            manager.exec_stmt(Statement::from_string(
                manager.get_database_backend(),
                stmt.to_owned(),
            )).await?;
        }

        // Disable RLS
        manager.exec_stmt(Statement::from_string(
            manager.get_database_backend(),
            "ALTER TABLE core.outbox DISABLE ROW LEVEL SECURITY;".to_owned(),
        )).await?;

        manager.drop_table(Table::drop().table(Alias::new(("core", "idempotency_records"))).to_owned()).await?;
        manager.drop_table(Table::drop().table(Alias::new(("core", "outbox"))).to_owned()).await?;
        manager.drop_type(Type::drop().name(Alias::new("app_schema")).to_owned()).await?;

        Ok(())
    }
}
