use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS core.aggregated_views (
                tenant_id UUID PRIMARY KEY,
                total_events BIGINT NOT NULL DEFAULT 0,
                last_updated_at TIMESTAMPTZ NOT NULL
            );
            "#,
        ).await?;
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS core.analytics_data_points (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                metric_name TEXT NOT NULL,
                value DOUBLE PRECISION NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL
            );
            "#,
        ).await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_data_points_tenant_metric ON core.analytics_data_points (tenant_id, metric_name);",
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS core.analytics_data_points;").await?;
        conn.execute_unprepared("DROP TABLE IF EXISTS core.aggregated_views;").await?;
        Ok(())
    }
}
