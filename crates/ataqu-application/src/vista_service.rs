//! VISTA application service – orchestrates analytics using real repositories.
use std::sync::Arc;
use uuid::Uuid;

use ataqu_domain_vista::aggregation::{AggregatedView, process_aggregation_event};
use ataqu_domain_vista::analytics::prepare_data_point;
use ataqu_domain_vista::repository::VistaRepository;
use ataqu_infra_outbox::OutboxEvent;
use ataqu_kernel::{Clock, TenantId};

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
    clock: Arc<dyn Clock>,
}

impl VistaService {
    pub fn new(repo: Arc<dyn VistaRepository + Send + Sync>, clock: Arc<dyn Clock>) -> Self {
        Self { repo, clock }
    }

    pub async fn process_event(&self, event: &OutboxEvent) -> VistaResult<()> {
        let tenant_id = event
            .payload
            .get("tenant_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok())
            .map(TenantId::new)
            .unwrap_or_else(|| TenantId::new(Uuid::nil()));
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

        // Save specific data points for time-series charts
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
    ) -> VistaResult<ataqu_domain_vista::Dashboard> {
        let mut dashboard = self
            .repo
            .get_dashboard_by_id(&tenant_id, id)
            .await
            .map_err(VistaServiceError::Repository)?
            .ok_or(VistaServiceError::Validation(
                "Dashboard not found".to_string(),
            ))?;

        if let Some(n) = name {
            dashboard.name = n;
        }
        if let Some(c) = config {
            dashboard.config = c;
        }
        dashboard.updated_at = chrono::DateTime::<chrono::Utc>::from(self.clock.now());

        self.repo
            .save_dashboard(&dashboard)
            .await
            .map_err(VistaServiceError::Repository)?;

        Ok(dashboard)
    }

    pub async fn execute_raw_sql(
        &self,
        tenant_id: TenantId,
        sql: &str,
    ) -> VistaResult<Vec<serde_json::Value>> {
        let trimmed_sql = sql.trim_start();
        let upper_sql = trimmed_sql.to_uppercase();
        if !upper_sql.starts_with("SELECT") && !upper_sql.starts_with("WITH") {
            return Err(VistaServiceError::Validation(
                "Only read-only SQL (SELECT or WITH) is permitted".to_string(),
            ));
        }
        if sql.contains(';') {
            return Err(VistaServiceError::Validation(
                "Multiple statements are not permitted".to_string(),
            ));
        }
        self.repo
            .execute_raw_sql(&tenant_id, sql)
            .await
            .map_err(VistaServiceError::Repository)
    }
}
