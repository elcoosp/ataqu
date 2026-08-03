// PAUSE application service — HR orchestration.
//
// Implements employee onboarding and leave request workflows following
// ADR-017 (Pure Domain Model with Application-Layer Orchestration) and
// ADR-006 (Idempotency via Advisory Locks & Durable Response Storage).

use std::sync::Arc;

use ataqu_kernel::{Clock, IdGenerator, TenantId};
// Use pub use to import and re-export domain types in one go
pub use ataqu_domain_pause::employee::{create_employee, CreateEmployeeCommand, EmployeeCreatedEvent};
pub use ataqu_domain_pause::leave::{request_leave, RequestLeaveCommand, LeaveRequestedEvent};

use uuid::Uuid;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::instrument;

// ============================================================================
// CONSTANTS
// ============================================================================

pub const PAUSE_SCHEMA: &str = "collab_ops";

// ============================================================================
// ERROR TYPES
// ============================================================================

#[derive(Debug, Error)]
pub enum PauseServiceError {
    #[error("validation error: {0}")]
    Validation(String),
    #[error("persistence error: {0}")]
    Persistence(String),
    #[error("outbox error: {0}")]
    Outbox(String),
    #[error("idempotency error: {0}")]
    Idempotency(String),
}

// ============================================================================
// RESULT TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CreateEmployeeResult {
    pub employee_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RequestLeaveResult {
    pub leave_request_id: Uuid,
}

// ============================================================================
// PORTS (Interfaces)
// ============================================================================

#[derive(Debug, Clone)]
pub struct IdempotencyGuardHandle {
    cached_response: Option<serde_json::Value>,
}

impl IdempotencyGuardHandle {
    pub fn new(cached_response: Option<serde_json::Value>) -> Self {
        Self { cached_response }
    }

    pub fn is_cached(&self) -> bool {
        self.cached_response.is_some()
    }

    pub fn get_cached<T: DeserializeOwned>(&self) -> Result<T, PauseServiceError> {
        let value = self
            .cached_response
            .as_ref()
            .ok_or_else(|| PauseServiceError::Idempotency("no cached response".into()))?;
        serde_json::from_value(value.clone())
            .map_err(|e| PauseServiceError::Idempotency(format!("cache deserialization: {e}")))
    }
}

#[async_trait::async_trait]
pub trait IdempotencyPort: Send + Sync {
    async fn acquire(&self, command_id: &Uuid)
    -> Result<IdempotencyGuardHandle, PauseServiceError>;
    async fn commit(
        &self,
        command_id: &Uuid,
        response_body: serde_json::Value,
    ) -> Result<(), PauseServiceError>;
    async fn rollback(&self, command_id: &Uuid) -> Result<(), PauseServiceError>;
}

#[async_trait::async_trait]
pub trait EmployeeRepositoryPort: Send + Sync {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &EmployeeCreatedEvent,
    ) -> Result<(), PauseServiceError>;
}

#[async_trait::async_trait]
pub trait LeaveRequestRepositoryPort: Send + Sync {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &LeaveRequestedEvent,
    ) -> Result<(), PauseServiceError>;
}

#[async_trait::async_trait]
pub trait OutboxPort: Send + Sync {
    async fn append(
        &self,
        schema: &str,
        event_type: &str,
        aggregate_id: Uuid,
        payload: &serde_json::Value,
    ) -> Result<(), PauseServiceError>;
}

// ============================================================================
// VALIDATION
// ============================================================================

fn validate_create_employee(cmd: &CreateEmployeeCommand) -> Result<(), PauseServiceError> {
    if cmd.first_name.trim().is_empty() {
        return Err(PauseServiceError::Validation(
            "first name cannot be empty".into(),
        ));
    }
    if cmd.last_name.trim().is_empty() {
        return Err(PauseServiceError::Validation(
            "last name cannot be empty".into(),
        ));
    }
    if cmd.email.trim().is_empty() {
        return Err(PauseServiceError::Validation(
            "email cannot be empty".into(),
        ));
    }
    Ok(())
}

fn validate_request_leave(cmd: &RequestLeaveCommand) -> Result<(), PauseServiceError> {
    if cmd.leave_type.trim().is_empty() {
        return Err(PauseServiceError::Validation(
            "leave type cannot be empty".into(),
        ));
    }
    if cmd.end_date < cmd.start_date {
        return Err(PauseServiceError::Validation(
            "end_date cannot be before start_date".into(),
        ));
    }
    Ok(())
}

// ============================================================================
// SERVICE
// ============================================================================

pub struct PauseService {
    idempotency: Arc<dyn IdempotencyPort>,
    employee_repo: Arc<dyn EmployeeRepositoryPort>,
    leave_request_repo: Arc<dyn LeaveRequestRepositoryPort>,
    outbox: Arc<dyn OutboxPort>,
}

impl PauseService {
    pub fn new(
        idempotency: Arc<dyn IdempotencyPort>,
        employee_repo: Arc<dyn EmployeeRepositoryPort>,
        leave_request_repo: Arc<dyn LeaveRequestRepositoryPort>,
        outbox: Arc<dyn OutboxPort>,
    ) -> Self {
        Self {
            idempotency,
            employee_repo,
            leave_request_repo,
            outbox,
        }
    }

    #[instrument(
        skip(self, id_gen, clock, command, command_id),
        fields(command_id = %command_id)
    )]
    pub async fn create_employee(
        &self,
        tenant_id: &TenantId,
        command: CreateEmployeeCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        command_id: Uuid,
    ) -> Result<CreateEmployeeResult, PauseServiceError> {
        let guard = self.idempotency.acquire(&command_id).await?;
        if guard.is_cached() {
            tracing::debug!(command_id = %command_id, "returning cached idempotency response");
            return guard.get_cached::<CreateEmployeeResult>();
        }

        let result = self
            .do_create_employee(tenant_id, command, id_gen, clock)
            .await;

        match result {
            Ok(result) => {
                let payload = serde_json::to_value(&result)
                    .map_err(|e| PauseServiceError::Idempotency(format!("serialization: {e}")))?;
                self.idempotency.commit(&command_id, payload).await?;
                Ok(result)
            }
            Err(e) => {
                if let Err(rb_err) = self.idempotency.rollback(&command_id).await {
                    tracing::error!(
                        command_id = %command_id,
                        original_error = %e,
                        rollback_error = %rb_err,
                        "idempotency rollback failed after domain error"
                    );
                }
                Err(e)
            }
        }
    }

    async fn do_create_employee(
        &self,
        tenant_id: &TenantId,
        command: CreateEmployeeCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
    ) -> Result<CreateEmployeeResult, PauseServiceError> {
        validate_create_employee(&command)?;

        let event = create_employee(command, id_gen, clock);

        self.employee_repo.insert(tenant_id, &event).await?;

        let payload = serde_json::to_value(&event)
            .map_err(|e| PauseServiceError::Outbox(format!("serialization: {e}")))?;

        self.outbox
            .append(
                PAUSE_SCHEMA,
                "EmployeeCreatedEvent",
                event.employee_id,
                &payload,
            )
            .await?;

        Ok(CreateEmployeeResult {
            employee_id: event.employee_id,
        })
    }

    #[instrument(
        skip(self, id_gen, clock, command, command_id),
        fields(command_id = %command_id)
    )]
    pub async fn request_leave(
        &self,
        tenant_id: &TenantId,
        command: RequestLeaveCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        command_id: Uuid,
    ) -> Result<RequestLeaveResult, PauseServiceError> {
        let guard = self.idempotency.acquire(&command_id).await?;
        if guard.is_cached() {
            tracing::debug!(command_id = %command_id, "returning cached idempotency response");
            return guard.get_cached::<RequestLeaveResult>();
        }

        let result = self
            .do_request_leave(tenant_id, command, id_gen, clock)
            .await;

        match result {
            Ok(result) => {
                let payload = serde_json::to_value(&result)
                    .map_err(|e| PauseServiceError::Idempotency(format!("serialization: {e}")))?;
                self.idempotency.commit(&command_id, payload).await?;
                Ok(result)
            }
            Err(e) => {
                if let Err(rb_err) = self.idempotency.rollback(&command_id).await {
                    tracing::error!(
                        command_id = %command_id,
                        original_error = %e,
                        rollback_error = %rb_err,
                        "idempotency rollback failed after domain error"
                    );
                }
                Err(e)
            }
        }
    }

    async fn do_request_leave(
        &self,
        tenant_id: &TenantId,
        command: RequestLeaveCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
    ) -> Result<RequestLeaveResult, PauseServiceError> {
        validate_request_leave(&command)?;

        let event = request_leave(command, id_gen, clock);

        self.leave_request_repo.insert(tenant_id, &event).await?;

        let payload = serde_json::to_value(&event)
            .map_err(|e| PauseServiceError::Outbox(format!("serialization: {e}")))?;

        self.outbox
            .append(
                PAUSE_SCHEMA,
                "LeaveRequestedEvent",
                event.leave_request_id,
                &payload,
            )
            .await?;

        Ok(RequestLeaveResult {
            leave_request_id: event.leave_request_id,
        })
    }
}
