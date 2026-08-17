use sea_orm::Statement;
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000035_create_amazon_sync"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS vault.amazon_integrations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES core.tenants(id),
                marketplace_id TEXT NOT NULL,
                seller_id TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                last_synced_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#.to_owned(),
        ))
        .await?;

        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS vault.amazon_sync_logs (
                id BIGSERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                sync_type TEXT NOT NULL,
                status TEXT NOT NULL,
                product_id UUID,
                amazon_id TEXT,
                error_message TEXT,
                retry_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#.to_owned(),
        ))
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "DROP TABLE IF EXISTS vault.amazon_sync_logs;".to_owned(),
        ))
        .await?;
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "DROP TABLE IF EXISTS vault.amazon_integrations;".to_owned(),
        ))
        .await?;
        Ok(())
    }
}
