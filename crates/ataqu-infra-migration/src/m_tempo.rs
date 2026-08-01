use sea_orm::Statement;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let sql = r#"
        CREATE TABLE IF NOT EXISTS collab_ops.bookings (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL,
            starts_at TIMESTAMPTZ NOT NULL,
            duration_seconds INT NOT NULL,
            ends_at TIMESTAMPTZ GENERATED ALWAYS AS (starts_at + (duration_seconds * INTERVAL '1 second')) STORED,
            oauth_access_token TEXT,
            oauth_refresh_token TEXT,
            oauth_token_expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON collab_ops.bookings (tenant_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_ends_at ON collab_ops.bookings (ends_at);
        "#;

        manager
            .get_connection()
            .execute_raw(Statement::from_sql_and_values(
                sea_orm::DbBackend::Postgres,
                sql,
                [],
            ))
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let sql = "DROP TABLE IF EXISTS collab_ops.bookings;";
        manager
            .get_connection()
            .execute_raw(Statement::from_sql_and_values(
                sea_orm::DbBackend::Postgres,
                sql,
                [],
            ))
            .await?;
        Ok(())
    }
}