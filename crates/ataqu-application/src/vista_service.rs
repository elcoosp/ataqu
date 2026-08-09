//! VISTA application service – orchestrates analytics using real repositories.

use std::sync::Arc;
use uuid::Uuid;

use sea_orm::{ConnectionTrait, DatabaseConnection};

use ataqu_domain_vista::aggregation::{AggregatedView, process_aggregation_event};
use ataqu_domain_vista::analytics::prepare_data_point;
use ataqu_domain_vista::repository::VistaRepository;
use ataqu_infra_outbox::OutboxEvent;
use ataqu_kernel::{Clock, IdGenerator, TenantId};

#[derive(Debug, thiserror::Error)]
pub enum VistaServiceError {
    #[error("Repository error: {0}")]
    Repository(String),
    #[error("Domain error: {0}")]
    Domain(String),
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type VistaResult<T> = Result<T, VistaServiceError>;

pub struct VistaService {
    repo: Arc<dyn VistaRepository + Send + Sync>,
    db: DatabaseConnection,
    clock: Arc<dyn Clock>,
    id_gen: Arc<dyn IdGenerator>,
}

impl VistaService {
    pub fn new(
        repo: Arc<dyn VistaRepository + Send + Sync>,
        db: DatabaseConnection,
        clock: Arc<dyn Clock>,
        id_gen: Arc<dyn IdGenerator>,
    ) -> Self {
        Self {
            repo,
            db,
            clock,
            id_gen,
        }
    }

    pub async fn create_dashboard(
        &self,
        tenant_id: TenantId,
        name: String,
        config: serde_json::Value,
    ) -> VistaResult<ataqu_domain_vista::Dashboard> {
        let dashboard = ataqu_domain_vista::Dashboard {
            id: self.id_gen.new_uuid_v7(),
            tenant_id,
            name,
            config,
            created_at: chrono::DateTime::<chrono::Utc>::from(self.clock.now()),
            updated_at: chrono::DateTime::<chrono::Utc>::from(self.clock.now()),
            version: 0,
        };
        self.repo
            .save_dashboard(&dashboard)
            .await
            .map_err(VistaServiceError::Repository)?;
        Ok(dashboard)
    }

    pub async fn process_event(&self, event: &OutboxEvent) -> VistaResult<()> {
        metrics::counter!("ataqu_vista_events_processed_total", "schema" => event.schema.clone(), "event_type" => event.event_type.clone()).increment(1);
        let tenant_id = match event.payload.get("tenant_id").and_then(|v| {
            if let serde_json::Value::String(s) = v {
                Uuid::parse_str(s).ok()
            } else {
                None
            }
        }) {
            Some(id) => TenantId::new(id),
            None => {
                tracing::warn!(event_type = %event.event_type, "Outbox event missing tenant_id in payload. Skipping.");
                return Ok(());
            }
        };
        let current_view = self
            .repo
            .get_aggregated_view(&tenant_id)
            .await
            .unwrap_or_else(|_| AggregatedView::new(tenant_id));
        let new_view = process_aggregation_event(
            current_view,
            &event.schema,
            &event.event_type,
            &event.payload,
            self.clock.as_ref(),
        );
        self.repo
            .save_aggregated_view(&new_view)
            .await
            .map_err(VistaServiceError::Repository)?;

        let metrics_to_log: Vec<(&str, f64)> =
            match (event.schema.as_str(), event.event_type.as_str()) {
                ("collab_crm", "DealCreated") => vec![(
                    "pipeline_value",
                    event
                        .payload
                        .get("amount")
                        .and_then(|v| {
                            v.as_f64()
                                .or_else(|| v.as_str().and_then(|s| s.parse::<f64>().ok()))
                        })
                        .unwrap_or(0.0),
                )],
                ("collab_crm", "DealWon") => vec![(
                    "revenue",
                    event
                        .payload
                        .get("amount")
                        .and_then(|v| {
                            v.as_f64()
                                .or_else(|| v.as_str().and_then(|s| s.parse::<f64>().ok()))
                        })
                        .unwrap_or(0.0),
                )],
                ("collab_crm", "ContactCreated") => vec![("contacts_created", 1.0)],
                ("vault", "ProductCreated") => vec![("products_created", 1.0)],
                _ => vec![],
            };

        for (metric, value) in metrics_to_log {
            if let Ok(point) =
                prepare_data_point(tenant_id, metric.to_string(), value, self.clock.as_ref())
            {
                self.repo
                    .save_data_point(&point)
                    .await
                    .map_err(VistaServiceError::Repository)?;
            }
        }
        Ok(())
    }

    pub async fn get_kpis(&self, tenant_id: TenantId) -> VistaResult<AggregatedView> {
        self.repo
            .get_aggregated_view(&tenant_id)
            .await
            .map_err(VistaServiceError::Repository)
    }

    pub async fn get_aggregated_view(&self, tenant_id: TenantId) -> VistaResult<AggregatedView> {
        self.repo
            .get_aggregated_view(&tenant_id)
            .await
            .map_err(VistaServiceError::Repository)
    }

    pub async fn get_data_points(
        &self,
        tenant_id: TenantId,
        metric: &str,
        limit: u64,
    ) -> VistaResult<Vec<ataqu_domain_vista::AnalyticsDataPoint>> {
        self.repo
            .get_data_points(&tenant_id, metric, limit)
            .await
            .map_err(VistaServiceError::Repository)
    }

    pub async fn save_dashboard(
        &self,
        dashboard: &ataqu_domain_vista::Dashboard,
    ) -> VistaResult<()> {
        self.repo
            .save_dashboard(dashboard)
            .await
            .map_err(VistaServiceError::Repository)
    }

    pub async fn list_dashboards(
        &self,
        tenant_id: TenantId,
    ) -> VistaResult<Vec<ataqu_domain_vista::Dashboard>> {
        self.repo
            .list_dashboards(&tenant_id)
            .await
            .map_err(VistaServiceError::Repository)
    }

    pub async fn delete_dashboard(&self, tenant_id: TenantId, id: Uuid) -> VistaResult<()> {
        self.repo
            .delete_dashboard(&tenant_id, id)
            .await
            .map_err(VistaServiceError::Repository)
    }

    pub async fn update_dashboard(
        &self,
        tenant_id: TenantId,
        id: Uuid,
        name: Option<String>,
        config: Option<serde_json::Value>,
        expected_version: i32,
    ) -> VistaResult<ataqu_domain_vista::Dashboard> {
        let mut dashboard = self
            .repo
            .get_dashboard_by_id(&tenant_id, id)
            .await
            .map_err(VistaServiceError::Repository)?
            .ok_or(VistaServiceError::Validation(
                "Dashboard not found".to_string(),
            ))?;

        if dashboard.version != expected_version {
            return Err(VistaServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, dashboard.version
            )));
        }

        if let Some(n) = name {
            dashboard.name = n;
        }
        if let Some(c) = config {
            dashboard.config = c;
        }
        dashboard.updated_at = chrono::DateTime::<chrono::Utc>::from(self.clock.now());
        dashboard.version += 1;

        self.repo
            .save_dashboard(&dashboard)
            .await
            .map_err(VistaServiceError::Repository)?;

        Ok(dashboard)
    }

    pub async fn execute_raw_sql(
        &self,
        _tenant_id: TenantId,
        _sql: &str,
    ) -> VistaResult<Vec<serde_json::Value>> {
        Err(VistaServiceError::Validation(
            "Raw SQL execution is disabled for security reasons".to_string(),
        ))
    }

    pub async fn get_drill_down_data(
        &self,
        tenant_id: TenantId,
        metric: String,
        _dimension: String,
        value: String,
        limit: u64,
    ) -> VistaResult<Vec<serde_json::Value>> {
        if limit > 1000 {
            return Err(VistaServiceError::Validation(
                "Limit exceeds maximum allowed value of 1000".to_string(),
            ));
        }

        // Map metric to actual table and column.
        // For MVP, we support revenue (deals) and contacts_created (contacts).
        let (schema, table, _column, date_col) = match metric.as_str() {
            "revenue" => ("collab_crm", "deals", "amount", "created_at"),
            "contacts_created" => ("collab_crm", "contacts", "id", "created_at"),
            "products_created" => ("vault", "products", "id", "created_at"),
            _ => return Err(VistaServiceError::Validation(format!("Unsupported metric: {}", metric))),
        };

        // Build SQL: SELECT * FROM {schema}.{table} WHERE tenant_id = $1 AND date_trunc('month', {date_col}) = $2::date LIMIT $3
        // Use dimension as the grouping.
        // For simplicity, we use value as a date string or a specific filter.
        let sql = format!(
            r#"
            SELECT *
            FROM {}.{}
            WHERE tenant_id = $1
              AND date_trunc('month', {}) = $2::date
            ORDER BY {} DESC
            LIMIT $3
            "#,
            schema, table, date_col, date_col
        );
        // Parse value as date.
        let date = chrono::NaiveDate::parse_from_str(&value, "%Y-%m")
            .or_else(|_| chrono::NaiveDate::parse_from_str(&value, "%Y-%m-%d"))
            .map_err(|_| VistaServiceError::Validation("Invalid date format, use YYYY-MM".to_string()))?;
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            &sql,
            [
                tenant_id.as_uuid().into(),
                date.into(),
                (limit as i64).into(),
            ],
        );

        let rows = self.db.query_all_raw(stmt).await
            .map_err(|e| VistaServiceError::Repository(e.to_string()))?;

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

    pub async fn get_cross_app_dashboard(
        &self,
        tenant_id: TenantId,
        view_name: String,
    ) -> VistaResult<Vec<serde_json::Value>> {
        self.repo
            .get_cross_app_view(&tenant_id, &view_name)
            .await
            .map_err(VistaServiceError::Repository)
    }

    pub async fn refresh_materialized_views(&self) -> VistaResult<()> {
        self.repo
            .refresh_materialized_views()
            .await
            .map_err(VistaServiceError::Repository)
    }

    pub async fn get_combined_dashboard(
        &self,
        tenant_id: TenantId,
        primary_metric: String,
        secondary_metric: String,
        from_date: chrono::DateTime<chrono::Utc>,
        to_date: chrono::DateTime<chrono::Utc>,
        _group_by: String,
    ) -> VistaResult<Vec<serde_json::Value>> {
        // Map primary and secondary to views.
        // We support: revenue_inventory, support_sales
        let view_name = match (primary_metric.as_str(), secondary_metric.as_str()) {
            ("revenue", "inventory") => "cross_app_revenue_inventory",
            ("support", "sales") => "cross_app_support_sales",
            _ => return Err(VistaServiceError::Validation("Unsupported combination".to_string())),
        };

        let sql = format!(
            r#"
            SELECT *
            FROM vista.{}
            WHERE tenant_id = $1
              AND day BETWEEN $2 AND $3
            ORDER BY day ASC
            "#,
            view_name
        );
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            &sql,
            [
                tenant_id.as_uuid().into(),
                from_date.into(),
                to_date.into(),
            ],
        );

        let rows = self.db.query_all_raw(stmt).await
            .map_err(|e| VistaServiceError::Repository(e.to_string()))?;

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