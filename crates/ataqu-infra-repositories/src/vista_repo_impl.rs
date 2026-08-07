use async_trait::async_trait;
use ataqu_domain_vista::aggregation::AggregatedView;
use ataqu_domain_vista::repository::VistaRepository;
use ataqu_kernel::TenantId;
use sea_orm::{ConnectionTrait, DatabaseConnection};
use uuid::Uuid;

pub struct VistaRepositoryImpl {
    db: DatabaseConnection,
}

impl VistaRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl VistaRepository for VistaRepositoryImpl {
    async fn get_aggregated_view(&self, tenant_id: &TenantId) -> Result<AggregatedView, String> {
        let sql = r#"
            SELECT tenant_id, total_events, total_contacts, total_deals, total_deals_won,
                   total_pipeline_value, total_revenue, total_products, low_stock_variants,
                   total_bookings, pending_leave_requests, last_updated_at
            FROM vista.aggregated_views
            WHERE tenant_id = $1
        "#;
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            [tenant_id.as_uuid().into()],
        );

        let row = self.db.query_one_raw(stmt).await
            .map_err(|e| e.to_string())?
            .ok_or("Aggregated view not found".to_string())?;

        let last_updated_dt: chrono::DateTime<chrono::Utc> = row.try_get("", "last_updated_at").map_err(|e| e.to_string())?;

        let view = AggregatedView {
            tenant_id: TenantId::new(row.try_get("", "tenant_id").map_err(|e| e.to_string())?),
            total_events: row.try_get::<i64>("", "total_events").map_err(|e| e.to_string())? as u64,
            total_contacts: row.try_get::<i64>("", "total_contacts").map_err(|e| e.to_string())? as u64,
            total_deals: row.try_get::<i64>("", "total_deals").map_err(|e| e.to_string())? as u64,
            total_deals_won: row.try_get::<i64>("", "total_deals_won").map_err(|e| e.to_string())? as u64,
            total_pipeline_value: row.try_get("", "total_pipeline_value").map_err(|e| e.to_string())?,
            total_revenue: row.try_get("", "total_revenue").map_err(|e| e.to_string())?,
            total_products: row.try_get::<i64>("", "total_products").map_err(|e| e.to_string())? as u64,
            low_stock_variants: row.try_get::<i64>("", "low_stock_variants").map_err(|e| e.to_string())? as u64,
            total_bookings: row.try_get::<i64>("", "total_bookings").map_err(|e| e.to_string())? as u64,
            pending_leave_requests: row.try_get::<i64>("", "pending_leave_requests").map_err(|e| e.to_string())? as u64,
            last_updated_at: last_updated_dt.into(),
        };
        Ok(view)
    }

    async fn save_aggregated_view(&self, view: &AggregatedView) -> Result<(), String> {
        let sql = r#"
            INSERT INTO vista.aggregated_views (
                tenant_id, total_events, total_contacts, total_deals, total_deals_won,
                total_pipeline_value, total_revenue, total_products, low_stock_variants,
                total_bookings, pending_leave_requests, last_updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (tenant_id) DO UPDATE SET
                total_events = EXCLUDED.total_events,
                total_contacts = EXCLUDED.total_contacts,
                total_deals = EXCLUDED.total_deals,
                total_deals_won = EXCLUDED.total_deals_won,
                total_pipeline_value = EXCLUDED.total_pipeline_value,
                total_revenue = EXCLUDED.total_revenue,
                total_products = EXCLUDED.total_products,
                low_stock_variants = EXCLUDED.low_stock_variants,
                total_bookings = EXCLUDED.total_bookings,
                pending_leave_requests = EXCLUDED.pending_leave_requests,
                last_updated_at = EXCLUDED.last_updated_at
        "#;
        let last_updated_dt: chrono::DateTime<chrono::Utc> = view.last_updated_at.into();
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            [
                view.tenant_id.as_uuid().into(),
                (view.total_events as i64).into(),
                (view.total_contacts as i64).into(),
                (view.total_deals as i64).into(),
                (view.total_deals_won as i64).into(),
                view.total_pipeline_value.into(),
                view.total_revenue.into(),
                (view.total_products as i64).into(),
                (view.low_stock_variants as i64).into(),
                (view.total_bookings as i64).into(),
                (view.pending_leave_requests as i64).into(),
                last_updated_dt.into(),
            ],
        );
        self.db.execute_raw(stmt).await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_data_points(&self, tenant_id: &TenantId, metric: &str, limit: u64) -> Result<Vec<ataqu_domain_vista::AnalyticsDataPoint>, String> {
        let sql = r#"
            SELECT tenant_id, metric_name, value, timestamp
            FROM vista.data_points
            WHERE tenant_id = $1 AND metric_name = $2
            ORDER BY timestamp DESC
            LIMIT $3
        "#;
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            [tenant_id.as_uuid().into(), metric.into(), (limit as i64).into()],
        );
        let rows = self.db.query_all_raw(stmt).await
            .map_err(|e| e.to_string())?;

        let mut points = Vec::new();
        for row in rows {
            let ts: chrono::DateTime<chrono::Utc> = row.try_get("", "timestamp").map_err(|e| e.to_string())?;
            points.push(ataqu_domain_vista::AnalyticsDataPoint {
                tenant_id: TenantId::new(row.try_get("", "tenant_id").map_err(|e| e.to_string())?),
                metric_name: row.try_get("", "metric_name").map_err(|e| e.to_string())?,
                value: row.try_get("", "value").map_err(|e| e.to_string())?,
                timestamp: ts.into(),
            });
        }
        Ok(points)
    }

    async fn save_data_point(&self, point: &ataqu_domain_vista::AnalyticsDataPoint) -> Result<(), String> {
        let sql = r#"
            INSERT INTO vista.data_points (tenant_id, metric_name, value, timestamp)
            VALUES ($1, $2, $3, $4)
        "#;
        let timestamp_dt: chrono::DateTime<chrono::Utc> = point.timestamp.into();
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            [
                point.tenant_id.as_uuid().into(),
                point.metric_name.clone().into(),
                point.value.into(),
                timestamp_dt.into(),
            ],
        );
        self.db.execute_raw(stmt).await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn save_dashboard(&self, dashboard: &ataqu_domain_vista::Dashboard) -> Result<(), String> {
        let sql = r#"
            INSERT INTO vista.dashboards (id, tenant_id, name, config, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                config = EXCLUDED.config,
                updated_at = EXCLUDED.updated_at
        "#;
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            [
                dashboard.id.into(),
                dashboard.tenant_id.as_uuid().into(),
                dashboard.name.clone().into(),
                dashboard.config.clone().into(),
                dashboard.created_at.into(),
                dashboard.updated_at.into(),
            ],
        );
        self.db.execute_raw(stmt).await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_dashboard_by_id(&self, tenant_id: &TenantId, id: Uuid) -> Result<Option<ataqu_domain_vista::Dashboard>, String> {
        let sql = r#"
            SELECT id, tenant_id, name, config, created_at, updated_at
            FROM vista.dashboards
            WHERE tenant_id = $1 AND id = $2
        "#;
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            [tenant_id.as_uuid().into(), id.into()],
        );
        let row = self.db.query_one_raw(stmt).await
            .map_err(|e| e.to_string())?;

        if let Some(row) = row {
            Ok(Some(ataqu_domain_vista::Dashboard {
                id: row.try_get("", "id").map_err(|e| e.to_string())?,
                tenant_id: TenantId::new(row.try_get("", "tenant_id").map_err(|e| e.to_string())?),
                name: row.try_get("", "name").map_err(|e| e.to_string())?,
                config: row.try_get("", "config").map_err(|e| e.to_string())?,
                created_at: row.try_get("", "created_at").map_err(|e| e.to_string())?,
                updated_at: row.try_get("", "updated_at").map_err(|e| e.to_string())?,
            }))
        } else {
            Ok(None)
        }
    }

    async fn list_dashboards(&self, tenant_id: &TenantId) -> Result<Vec<ataqu_domain_vista::Dashboard>, String> {
        let sql = r#"
            SELECT id, tenant_id, name, config, created_at, updated_at
            FROM vista.dashboards
            WHERE tenant_id = $1
        "#;
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            [tenant_id.as_uuid().into()],
        );
        let rows = self.db.query_all_raw(stmt).await
            .map_err(|e| e.to_string())?;

        let mut dashboards = Vec::new();
        for row in rows {
            dashboards.push(ataqu_domain_vista::Dashboard {
                id: row.try_get("", "id").map_err(|e| e.to_string())?,
                tenant_id: TenantId::new(row.try_get("", "tenant_id").map_err(|e| e.to_string())?),
                name: row.try_get("", "name").map_err(|e| e.to_string())?,
                config: row.try_get("", "config").map_err(|e| e.to_string())?,
                created_at: row.try_get("", "created_at").map_err(|e| e.to_string())?,
                updated_at: row.try_get("", "updated_at").map_err(|e| e.to_string())?,
            });
        }
        Ok(dashboards)
    }

    async fn delete_dashboard(&self, tenant_id: &TenantId, id: Uuid) -> Result<(), String> {
        let sql = r#"DELETE FROM vista.dashboards WHERE tenant_id = $1 AND id = $2"#;
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            [tenant_id.as_uuid().into(), id.into()],
        );
        self.db.execute_raw(stmt).await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn execute_raw_sql(&self, tenant_id: &TenantId, sql: &str) -> Result<Vec<serde_json::Value>, String> {
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            [tenant_id.as_uuid().into()],
        );
        let rows = self.db.query_all_raw(stmt).await
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            let mut obj = serde_json::Map::new();
            for col_name in row.column_names() {
                let val: Option<String> = row.try_get("", &col_name).ok();
                obj.insert(col_name, serde_json::json!(val));
            }
            results.push(serde_json::Value::Object(obj));
        }
        Ok(results)
    }
}
