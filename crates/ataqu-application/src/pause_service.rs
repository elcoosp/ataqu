//! PAUSE application service — HR orchestration.
//! Uses domain types and repository traits from domain crate.
use std::sync::Arc;
use uuid::Uuid;
use serde_json::Value;
use async_trait::async_trait;

// Re-export domain types for convenience
pub use ataqu_domain_pause::{
    Employee, CreateEmployeeCommand, EmployeeCreatedEvent,
    LeaveRequest, RequestLeaveCommand, LeaveRequestedEvent,
    PauseDomainError,
};

// Application-specific error type.
#[derive(Debug, thiserror::Error)]
pub enum PauseServiceError {
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Persistence error: {0}")]
    Persistence(String),
    #[error("Outbox error: {0}")]
    Outbox(String),
    #[error("Idempotency error: {0}")]
    Idempotency(String),
    #[error("Domain error: {0}")]
    Domain(#[from] PauseDomainError),
}

pub const PAUSE_SCHEMA: &str = "collab_ops";

// Idempotency port (still application-specific)
#[async_trait]
pub trait IdempotencyPort: Send + Sync {
    async fn acquire(&self, command_id: &Uuid) -> Result<IdempotencyGuardHandle, PauseServiceError>;
    async fn commit(&self, command_id: &Uuid, response_body: Value) -> Result<(), PauseServiceError>;
    async fn rollback(&self, command_id: &Uuid) -> Result<(), PauseServiceError>;
}

pub struct IdempotencyGuardHandle {
    cached_response: Option<Value>,
}
impl IdempotencyGuardHandle {
    pub fn new(cached_response: Option<Value>) -> Self {
        Self { cached_response }
    }
    pub fn is_cached(&self) -> bool {
        self.cached_response.is_some()
    }
    pub fn get_cached<T: serde::de::DeserializeOwned>(&self) -> Result<T, PauseServiceError> {
        let value = self.cached_response.as_ref()
            .ok_or_else(|| PauseServiceError::Idempotency("no cached response".into()))?;
        serde_json::from_value(value.clone())
            .map_err(|e| PauseServiceError::Idempotency(format!("cache deserialization: {e}")))
    }
}

// Outbox port (application-specific)
#[async_trait]
pub trait OutboxPort: Send + Sync {
    async fn append(&self, schema: &str, event_type: &str, aggregate_id: Uuid, payload: &Value) -> Result<(), PauseServiceError>;
}

// The service itself, using domain repository traits and application ports.
pub struct PauseService {
    idempotency: Arc<dyn IdempotencyPort>,
    employee_repo: Arc<dyn ataqu_domain_pause::repository::EmployeeRepositoryPort>,
    leave_request_repo: Arc<dyn ataqu_domain_pause::repository::LeaveRequestRepositoryPort>,
    outbox: Arc<dyn OutboxPort>,
}

impl PauseService {
    pub fn new(
        idempotency: Arc<dyn IdempotencyPort>,
        employee_repo: Arc<dyn ataqu_domain_pause::repository::EmployeeRepositoryPort>,
        leave_request_repo: Arc<dyn ataqu_domain_pause::repository::LeaveRequestRepositoryPort>,
        outbox: Arc<dyn OutboxPort>,
    ) -> Self {
        Self { idempotency, employee_repo, leave_request_repo, outbox }
    }

    pub async fn create_employee(
        &self,
        tenant_id: &ataqu_kernel::TenantId,
        command: CreateEmployeeCommand,
        id_gen: &impl ataqu_kernel::IdGenerator,
        clock: &impl ataqu_kernel::Clock,
        command_id: Uuid,
    ) -> Result<Uuid, PauseServiceError> {
        let guard = self.idempotency.acquire(&command_id).await?;
        if guard.is_cached() {
            return guard.get_cached::<Uuid>();
        }
        let event = ataqu_domain_pause::employee::create_employee(command, id_gen, clock);
        self.employee_repo.insert(tenant_id, &event).await?;
        let payload = serde_json::to_value(&event)
            .map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
        self.outbox.append(PAUSE_SCHEMA, "EmployeeCreatedEvent", event.employee_id, &payload).await?;
        self.idempotency.commit(&command_id, serde_json::to_value(&event.employee_id).unwrap()).await?;
        Ok(event.employee_id)
    }

    pub async fn request_leave(
        &self,
        tenant_id: &ataqu_kernel::TenantId,
        command: RequestLeaveCommand,
        id_gen: &impl ataqu_kernel::IdGenerator,
        clock: &impl ataqu_kernel::Clock,
        command_id: Uuid,
    ) -> Result<Uuid, PauseServiceError> {
        let guard = self.idempotency.acquire(&command_id).await?;
        if guard.is_cached() {
            return guard.get_cached::<Uuid>();
        }
        let event = ataqu_domain_pause::leave::request_leave(command, id_gen, clock);
        self.leave_request_repo.insert(tenant_id, &event).await?;
        let payload = serde_json::to_value(&event)
            .map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
        self.outbox.append(PAUSE_SCHEMA, "LeaveRequestedEvent", event.leave_request_id, &payload).await?;
        self.idempotency.commit(&command_id, serde_json::to_value(&event.leave_request_id).unwrap()).await?;
        Ok(event.leave_request_id)
    }
}
