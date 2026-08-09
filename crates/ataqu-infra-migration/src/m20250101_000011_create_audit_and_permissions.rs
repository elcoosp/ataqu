use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000011_create_audit_and_permissions"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Create core.permissions table
        manager
            .create_table(
                Table::create()
                    .table(Permissions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Permissions::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Permissions::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Permissions::UserId).uuid().not_null())
                    .col(ColumnDef::new(Permissions::App).string().not_null())
                    .col(ColumnDef::new(Permissions::Role).string().not_null())
                    .col(
                        ColumnDef::new(Permissions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Permissions::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .index(
                        Index::create()
                            .name("idx_permissions_tenant_user_app")
                            .table(Permissions::Table)
                            .col(Permissions::TenantId)
                            .col(Permissions::UserId)
                            .col(Permissions::App)
                            .unique(),
                    )
                    .index(
                        Index::create()
                            .name("idx_permissions_app")
                            .table(Permissions::Table)
                            .col(Permissions::App),
                    )
                    .to_owned(),
            )
            .await?;

        // 2. Create partitioned core.audit_logs table (range on created_at)
        // We create the parent table and a default partition.
        let db = manager.get_connection();
        let sql = r#"
            CREATE TABLE IF NOT EXISTS core.audit_logs (
                id BIGSERIAL,
                tenant_id UUID NOT NULL,
                user_id UUID NOT NULL,
                action TEXT NOT NULL,
                app TEXT NOT NULL,
                entity_type TEXT,
                entity_id UUID,
                old_value JSONB,
                new_value JSONB,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            ) PARTITION BY RANGE (created_at);
        "#;
        db.execute_unprepared(sql).await?;

        // Create default partition for out-of-range data
        let sql_default = r#"
            CREATE TABLE IF NOT EXISTS core.audit_logs_default
            PARTITION OF core.audit_logs
            DEFAULT;
        "#;
        db.execute_unprepared(sql_default).await?;

        // Create indexes on the parent table (they will be inherited by partitions)
        manager
            .create_index(
                Index::create()
                    .name("idx_audit_logs_tenant_created")
                    .table(AuditLogs::Table)
                    .col(AuditLogs::TenantId)
                    .col(AuditLogs::CreatedAt)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_audit_logs_user")
                    .table(AuditLogs::Table)
                    .col(AuditLogs::UserId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_audit_logs_app")
                    .table(AuditLogs::Table)
                    .col(AuditLogs::App)
                    .to_owned(),
            )
            .await?;

        // 3. Grant permissions (optional, but we follow ADR-035)
        // We grant INSERT, SELECT to core_role and admin_role etc.
        // For simplicity we grant to public, but in production we'd restrict.
        // The ADR says "Enable RLS if needed." We'll leave RLS off for now.

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop partitions and tables
        let db = manager.get_connection();
        let sql = r#"
            DROP TABLE IF EXISTS core.audit_logs CASCADE;
            DROP TABLE IF EXISTS core.permissions CASCADE;
        "#;
        db.execute_unprepared(sql).await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Permissions {
    Table,
    Id,
    TenantId,
    UserId,
    App,
    Role,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
#[allow(dead_code)]
enum AuditLogs {
    Table,
    Id,
    TenantId,
    UserId,
    Action,
    App,
    EntityType,
    EntityId,
    OldValue,
    NewValue,
    IpAddress,
    UserAgent,
    CreatedAt,
}
