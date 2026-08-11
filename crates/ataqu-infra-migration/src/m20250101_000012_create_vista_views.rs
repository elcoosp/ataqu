use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000012_create_vista_views"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Check if dial.tickets exists before creating the view.
        // If it doesn't exist, we'll skip the support_sales view creation.
        let check_sql = "SELECT to_regclass('dial.tickets')";
        let stmt =
            sea_orm::Statement::from_sql_and_values(sea_orm::DbBackend::Postgres, check_sql, []);
        let rows = db.query_all_raw(stmt).await?;
        let tickets_exists = !rows.is_empty()
            && rows[0]
                .try_get::<Option<String>>("", "to_regclass")
                .ok()
                .flatten()
                .is_some();

        let revenue_inventory = r#"
            CREATE MATERIALIZED VIEW IF NOT EXISTS vista.cross_app_revenue_inventory AS
            SELECT
                c.tenant_id,
                date_trunc('day', c.won_at) AS day,
                COUNT(c.id) AS deals_won,
                COALESCE(SUM(c.amount), 0) AS revenue,
                AVG(v.stock_quantity) AS avg_stock,
                COUNT(v.id) AS products_in_stock
            FROM collab_crm.deals c
            LEFT JOIN vault.variants v ON v.tenant_id = c.tenant_id
            WHERE c.status = 'won'
            GROUP BY c.tenant_id, date_trunc('day', c.won_at);
        "#;

        let support_sales = if tickets_exists {
            r#"
            CREATE MATERIALIZED VIEW IF NOT EXISTS vista.cross_app_support_sales AS
            SELECT
                d.tenant_id,
                date_trunc('day', d.created_at) AS day,
                COUNT(DISTINCT d.id) AS tickets_opened,
                COUNT(DISTINCT c.id) AS deals_in_pipeline,
                AVG(d.resolution_time_minutes) AS avg_resolution_time
            FROM dial.tickets d
            LEFT JOIN collab_crm.deals c ON c.tenant_id = d.tenant_id AND c.status IN ('qualified', 'negotiation')
            WHERE d.status != 'closed'
            GROUP BY d.tenant_id, date_trunc('day', d.created_at);
            "#
        } else {
            ""
        };

        let idx_1 = "CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_app_rev_inv_tenant_day ON vista.cross_app_revenue_inventory (tenant_id, day);";
        let idx_2 = "CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_app_sup_sales_tenant_day ON vista.cross_app_support_sales (tenant_id, day);";

        db.execute_unprepared(revenue_inventory).await?;
        if !support_sales.is_empty() {
            db.execute_unprepared(support_sales).await?;
            db.execute_unprepared(idx_2).await?;
        }
        db.execute_unprepared(idx_1).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                "DROP MATERIALIZED VIEW IF EXISTS vista.cross_app_revenue_inventory;",
            )
            .await?;
        manager
            .get_connection()
            .execute_unprepared("DROP MATERIALIZED VIEW IF EXISTS vista.cross_app_support_sales;")
            .await?;
        Ok(())
    }
}
