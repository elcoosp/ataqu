//! VISTA application service – orchestrates analytics using real repositories.
use std::sync::Arc;
use uuid::Uuid;

use ataqu_kernel::{Clock, TenantId};
use ataqu_domain_vista::aggregation::{AggregatedView, process_aggregation_event};
use ataqu_domain_vista::analytics::prepare_data_point;
use ataqu_domain_vista::repository::VistaRepository;
use ataqu_infra_outbox::OutboxEvent;

#[derive(Debug, thiserror::Error)]
pub enum VistaServiceError {
    #[error("Repository error: {0}")]
    Repository(String),
    #[error("Domain error: {0}")]
    Domain(String),
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
        let tenant_id = event.aggregate_id.map(TenantId::new).unwrap_or_else(|| TenantId::new(Uuid::nil()));
        let current_view = self.repo.get_aggregated_view(&tenant_id).await
            .unwrap_or_else(|_| AggregatedView::new(tenant_id));
        let new_view = process_aggregation_event(
            current_view,
            &event.schema,
            &event.event_type,
            &event.payload,
            self.clock.as_ref(),
        );
        self.repo.save_aggregated_view(&new_view).await.map_err(|e| VistaServiceError::Repository(e))?;
        if let Ok(point) = prepare_data_point(tenant_id, "event_count".to_string(), 1.0, self.clock.as_ref()) {
            self.repo.save_data_point(&point).await.map_err(|e| VistaServiceError::Repository(e))?;
        }
        Ok(())
    }

    pub async fn get_kpis(&self, tenant_id: TenantId) -> VistaResult<AggregatedView> {
        self.repo.get_aggregated_view(&tenant_id).await
            .map_err(|e| VistaServiceError::Repository(e))
    }

    pub async fn get_aggregated_view(&self, tenant_id: TenantId) -> VistaResult<AggregatedView> {
        self.repo.get_aggregated_view(&tenant_id).await
            .map_err(|e| VistaServiceError::Repository(e))
    }
}
