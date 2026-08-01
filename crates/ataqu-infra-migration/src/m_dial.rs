use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create DIAL schema if not exists
        manager
            .execute_raw(r#"CREATE SCHEMA IF NOT EXISTS dial;"#, &[])
            .await?;

        // Create channels table
        manager
            .create_table(
                Table::create()
                    .table(TableRef::new("dial", "channels"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("id")).uuid().primary_key())
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("name")).string().not_null())
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default("NOW()"),
                    )
                    .col(
                        ColumnDef::new(Alias::new("updated_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default("NOW()"),
                    )
                    .to_owned(),
            )
            .await?;

        // Create messages table
        manager
            .create_table(
                Table::create()
                    .table(TableRef::new("dial", "messages"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("id")).uuid().primary_key())
                    .col(ColumnDef::new(Alias::new("channel_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("sender_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("content")).text().not_null())
                    .col(
                        ColumnDef::new(Alias::new("sent_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default("NOW()"),
                    )
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default("NOW()"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(TableRef::new("dial", "messages"), Alias::new("channel_id"))
                            .to(TableRef::new("dial", "channels"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Enable RLS on both tables
        manager
            .execute_raw(
                r#"ALTER TABLE dial.channels ENABLE ROW LEVEL SECURITY;"#,
                &[],
            )
            .await?;
        manager
            .execute_raw(
                r#"ALTER TABLE dial.messages ENABLE ROW LEVEL SECURITY;"#,
                &[],
            )
            .await?;

        // Create RLS policies with IF NOT EXISTS
        let policies = vec![
            ("dial.channels", "channels_tenant_policy"),
            ("dial.messages", "messages_tenant_policy"),
        ];
        for (table, name) in policies {
            for (op, using_or_check) in [
                ("SELECT", "USING"),
                ("INSERT", "WITH CHECK"),
                ("UPDATE", "USING"),
                ("DELETE", "USING"),
            ] {
                let policy_name = format!("{}_{}_policy", name, op.to_lowercase());
                let check_clause = if op == "INSERT" || op == "UPDATE" {
                    format!("WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid)")
                } else {
                    format!("USING (tenant_id = current_setting('app.tenant_id')::uuid)")
                };
                // For UPDATE we need both USING and WITH CHECK
                let sql = if op == "UPDATE" {
                    format!(
                        r#"CREATE POLICY IF NOT EXISTS {policy_name} ON {table} FOR {op}
                           USING (tenant_id = current_setting('app.tenant_id')::uuid)
                           WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);"#
                    )
                } else {
                    format!(
                        r#"CREATE POLICY IF NOT EXISTS {policy_name} ON {table} FOR {op}
                           {check_clause};"#
                    )
                };
                manager.execute_raw(&sql, &[]).await?;
            }
        }

        // Create indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_channels_tenant")
                    .table(TableRef::new("dial", "channels"))
                    .col(Alias::new("tenant_id"))
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_messages_tenant_channel")
                    .table(TableRef::new("dial", "messages"))
                    .col(Alias::new("tenant_id"))
                    .col(Alias::new("channel_id"))
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_messages_sent_at")
                    .table(TableRef::new("dial", "messages"))
                    .col(Alias::new("sent_at"))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables (cascade will drop foreign keys)
        manager
            .drop_table(
                Table::drop()
                    .table(TableRef::new("dial", "messages"))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table(TableRef::new("dial", "channels"))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

fn TableRef(schema: &str, table: &str) -> sea_orm_migration::schema::TableRef {
    sea_orm_migration::schema::TableRef::SchemaTable(
        sea_orm::sea_orm::SchemaName::new(schema.to_owned()),
        sea_orm::sea_orm::TableName::new(table.to_owned()),
    )
}
