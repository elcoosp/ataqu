use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
#[allow(dead_code)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Create core.users table
        db.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS core.users (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                mfa_secret TEXT,
                name TEXT,
                mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
            "#,
        )
        .await?;

        db.execute_unprepared(
            "ALTER TABLE core.users ADD CONSTRAINT users_tenant_email_unique UNIQUE (tenant_id, email);"
        ).await?;

        // Indexes
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_users_tenant ON core.users (tenant_id);",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS core.users;")
            .await?;
        Ok(())
    }
}
