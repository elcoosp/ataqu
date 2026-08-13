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
                    .to_owned(),
            )
            .await?;

        // Indexes for permissions (added separately)
        manager
            .create_index(
                Index::create()
                    .name("idx_permissions_tenant_user_app")
                    .table(Permissions::Table)
                    .col(Permissions::TenantId)
                    .col(Permissions::UserId)
                    .col(Permissions::App)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_permissions_app")
                    .table(Permissions::Table)
                    .col(Permissions::App)
                    .to_owned(),
            )
            .await?;

        // 2. Create core.audit_logs as a normal table (no partitioning)
        manager
            .create_table(
                Table::create()
                    .table(AuditLogs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AuditLogs::Id)
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(AuditLogs::TenantId).uuid().not_null())
                    .col(ColumnDef::new(AuditLogs::UserId).uuid().not_null())
                    .col(ColumnDef::new(AuditLogs::Action).string().not_null())
                    .col(ColumnDef::new(AuditLogs::App).string().not_null())
                    .col(ColumnDef::new(AuditLogs::EntityType).string())
                    .col(ColumnDef::new(AuditLogs::EntityId).uuid())
                    .col(ColumnDef::new(AuditLogs::OldValue).json_binary())
                    .col(ColumnDef::new(AuditLogs::NewValue).json_binary())
                    .col(ColumnDef::new(AuditLogs::IpAddress).custom(Alias::new("INET")))
                    .col(ColumnDef::new(AuditLogs::UserAgent).string())
                    .col(
                        ColumnDef::new(AuditLogs::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Indexes for audit_logs
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

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AuditLogs::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Permissions::Table).to_owned())
            .await?;
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
