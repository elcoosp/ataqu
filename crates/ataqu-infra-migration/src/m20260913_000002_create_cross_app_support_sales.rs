use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            r#"
            CREATE MATERIALIZED VIEW IF NOT EXISTS vista.cross_app_support_sales AS
            SELECT
                d.tenant_id,
                date_trunc('day', d.created_at) AS day,
                COUNT(DISTINCT d.id) AS tickets_opened,
                COUNT(DISTINCT c.id) AS deals_in_pipeline,
                AVG(d.resolution_time_minutes) AS avg_resolution_time
            FROM dial.tickets d
            LEFT JOIN collab_crm.deals c
                   ON c.tenant_id = d.tenant_id
                  AND c.status IN ('qualified', 'negotiation')
            WHERE d.status != 'closed'
            GROUP BY d.tenant_id, date_trunc('day', d.created_at);
            "#,
        )
        .await?;

        db.execute_unprepared(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_app_sup_sales_tenant_day ON vista.cross_app_support_sales (tenant_id, day);"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP MATERIALIZED VIEW IF EXISTS vista.cross_app_support_sales;")
            .await?;
        Ok(())
    }
}
