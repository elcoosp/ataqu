use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS vault.reservations (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                variant_id UUID NOT NULL,
                quantity INT NOT NULL,
                status TEXT NOT NULL,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_reservations_tenant_variant ON vault.reservations (tenant_id, variant_id);
            "#,
        ).await?;
        Ok(())
    }
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS vault.reservations;")
            .await?;
        Ok(())
    }
}
