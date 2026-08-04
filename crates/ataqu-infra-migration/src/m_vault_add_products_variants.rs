use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS vault.products (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                sku TEXT NOT NULL UNIQUE,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            );
            "#
        ).await?;
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS vault.variants (
                id UUID PRIMARY KEY,
                product_id UUID NOT NULL,
                tenant_id UUID NOT NULL,
                sku TEXT NOT NULL UNIQUE,
                price BIGINT NOT NULL DEFAULT 0,
                stock_quantity BIGINT NOT NULL,
                reserved_quantity BIGINT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            );
            "#
        ).await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_variants_product ON vault.variants (product_id);"
        ).await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_variants_tenant ON vault.variants (tenant_id);"
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS vault.variants;").await?;
        conn.execute_unprepared("DROP TABLE IF EXISTS vault.products;").await?;
        Ok(())
    }
}
