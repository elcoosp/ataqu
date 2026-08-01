use ataqu_kernel::{Clock, TenantId};
use std::time::SystemTime;
use uuid::Uuid;

/// Represents a pre-aggregated view state for a tenant.
#[derive(Debug, Clone, PartialEq)]
pub struct AggregatedView {
    pub tenant_id: TenantId,
    pub total_events: u64,
    pub last_updated_at: SystemTime,
}

impl AggregatedView {
    pub fn new(tenant_id: TenantId) -> Self {
        Self {
            tenant_id,
            total_events: 0,
            last_updated_at: SystemTime::UNIX_EPOCH,
        }
    }
}

/// Pure function to process an outbox event and update the pre-aggregated view.
/// This function is strictly pure: it takes the current state, event details, and a clock,
/// and returns the new state without any I/O or side effects.
pub fn process_aggregation_event(
    mut current_state: AggregatedView,
    _event_type: &str,
    _aggregate_id: Uuid,
    clock: &impl Clock,
) -> AggregatedView {
    // In a real scenario, this would match on event_type and update specific metrics.
    // For now, we increment total_events and update the timestamp.
    current_state.total_events += 1;
    current_state.last_updated_at = clock.now();
    current_state
}

/// Repository trait for VISTA persistence operations.
/// Implemented by `ataqu-infra-repositories`.
/// Note: Kept synchronous to adhere to domain purity principles;
/// actual I/O is deferred to the infrastructure layer's execution context.
pub trait VistaRepository {
    fn get_aggregated_view(&self, tenant_id: &TenantId) -> Result<AggregatedView, VistaError>;
    fn save_aggregated_view(&self, view: &AggregatedView) -> Result<(), VistaError>;
}

#[derive(Debug, thiserror::Error)]
pub enum VistaError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("View not found for tenant")]
    NotFound,
}
