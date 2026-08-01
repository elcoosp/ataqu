use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
#[allow(dead_code)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(pk_uuid(User::Id))
                    .col(uuid(User::TenantId))
                    .col(string(User::Email))
                    .col(string(User::PasswordHash))
                    .col(string_null(User::MfaSecret))
                    .col(string_null(User::Name))
                    .col(boolean(User::MfaEnabled))
                    .col(timestamp_with_time_zone(User::CreatedAt))
                    .col(timestamp_with_time_zone(User::UpdatedAt))
                    .col(timestamp_with_time_zone_null(User::DeletedAt))
                    .index(Index::create().col(User::Email).unique())
                    .index(Index::create().col(User::TenantId))
                    .to_owned(),
            )
            .await?;

        // Enable RLS
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE core.users ENABLE ROW LEVEL SECURITY")
            .await?;

        // RLS policy: tenant isolation via current_setting
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE POLICY users_tenant_isolation ON core.users
                USING (tenant_id = (current_setting('app.current_tenant_id'))::uuid)
                WITH CHECK (tenant_id = (current_setting('app.current_tenant_id'))::uuid)
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
#[allow(dead_code)]
enum User {
    Table,
    Id,
    TenantId,
    Email,
    PasswordHash,
    MfaSecret,
    Name,
    MfaEnabled,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}