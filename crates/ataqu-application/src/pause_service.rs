//! PAUSE application service — HR orchestration.
//! Uses domain types and repository traits from domain crate.
use serde_json::Value;
use std::sync::Arc;
use uuid::Uuid;

// Re-export domain types for convenience
pub use ataqu_domain_pause::{
    CreateEmployeeCommand, Employee, EmployeeCreatedEvent, LeaveRequest, LeaveRequestedEvent,
    LeaveStatus, LeaveType, PauseDomainError, RequestLeaveCommand,
};

use crate::outbox::Outbox;
use ataqu_kernel::{Clock, IdGenerator, TenantId};

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
    #[error("Not found")]
    NotFound,
}

pub const PAUSE_SCHEMA: &str = "collab_ops";

// Idempotency port (still application-specific)
#[async_trait::async_trait]
pub trait IdempotencyPort: Send + Sync {
    async fn acquire(&self, command_id: &Uuid)
    -> Result<IdempotencyGuardHandle, PauseServiceError>;
    async fn commit(
        &self,
        command_id: &Uuid,
        response_body: Value,
    ) -> Result<(), PauseServiceError>;
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
        let value = self
            .cached_response
            .as_ref()
            .ok_or_else(|| PauseServiceError::Idempotency("no cached response".into()))?;
        serde_json::from_value(value.clone())
            .map_err(|e| PauseServiceError::Idempotency(format!("cache deserialization: {e}")))
    }
}

// The service itself, using domain repository traits and application ports.
pub struct PauseService {
    idempotency: Arc<dyn IdempotencyPort>,
    employee_repo: Arc<dyn ataqu_domain_pause::repository::EmployeeRepositoryPort>,
    leave_request_repo: Arc<dyn ataqu_domain_pause::repository::LeaveRequestRepositoryPort>,
    document_repo:
        Arc<dyn ataqu_domain_pause::repository::EmployeeDocumentRepository + Send + Sync>,
    outbox: Arc<dyn Outbox + Send + Sync>,
    clock: Arc<dyn Clock>,
}

impl PauseService {
    pub fn new(
        idempotency: Arc<dyn IdempotencyPort>,
        employee_repo: Arc<dyn ataqu_domain_pause::repository::EmployeeRepositoryPort>,
        leave_request_repo: Arc<dyn ataqu_domain_pause::repository::LeaveRequestRepositoryPort>,
        document_repo: Arc<
            dyn ataqu_domain_pause::repository::EmployeeDocumentRepository + Send + Sync,
        >,
        outbox: Arc<dyn Outbox + Send + Sync>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            idempotency,
            employee_repo,
            leave_request_repo,
            document_repo,
            outbox,
            clock,
        }
    }

    pub async fn create_employee(
        &self,
        tenant_id: &TenantId,
        command: CreateEmployeeCommand,
        id_gen: &dyn IdGenerator,
        clock: &dyn Clock,
        command_id: Uuid,
    ) -> Result<Uuid, PauseServiceError> {
        let guard = self.idempotency.acquire(&command_id).await?;
        if guard.is_cached() {
            return guard.get_cached::<Uuid>();
        }
        let event = ataqu_domain_pause::employee::create_employee(command, id_gen, clock);
        self.employee_repo.insert(tenant_id, &event).await?;
        let payload = serde_json::json!({
            "employee_id": event.employee_id,
            "tenant_id": event.tenant_id,
            "full_name": event.full_name,
            "job_title": event.job_title,
            "department": event.department,
            "hire_date": event.hire_date,
            "created_at": event.created_at,
        });
        self.outbox
            .append(
                PAUSE_SCHEMA,
                "EmployeeCreatedEvent",
                event.employee_id,
                &payload,
            )
            .await
            .map_err(|e| PauseServiceError::Outbox(e))?;
        self.idempotency
            .commit(
                &command_id,
                serde_json::to_value(event.employee_id).unwrap(),
            )
            .await?;
        Ok(event.employee_id)
    }

    pub async fn request_leave(
        &self,
        tenant_id: &TenantId,
        command: RequestLeaveCommand,
        id_gen: &dyn IdGenerator,
        clock: &dyn Clock,
        command_id: Uuid,
    ) -> Result<Uuid, PauseServiceError> {
        let guard = self.idempotency.acquire(&command_id).await?;
        if guard.is_cached() {
            return guard.get_cached::<Uuid>();
        }
        let event = ataqu_domain_pause::leave::request_leave(command, id_gen, clock);
        self.leave_request_repo.insert(tenant_id, &event).await?;
        let payload =
            serde_json::to_value(&event).map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
        self.outbox
            .append(
                PAUSE_SCHEMA,
                "LeaveRequestedEvent",
                event.leave_request_id,
                &payload,
            )
            .await
            .map_err(|e| PauseServiceError::Outbox(e))?;
        self.idempotency
            .commit(
                &command_id,
                serde_json::to_value(event.leave_request_id).unwrap(),
            )
            .await?;
        Ok(event.leave_request_id)
    }

    pub async fn find_employee(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<ataqu_domain_pause::Employee, PauseServiceError> {
        self.employee_repo
            .find_by_id(tenant_id, employee_id)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))?
            .ok_or(PauseServiceError::NotFound)
    }

    pub async fn find_leave_request(
        &self,
        tenant_id: &TenantId,
        leave_id: Uuid,
    ) -> Result<ataqu_domain_pause::LeaveRequest, PauseServiceError> {
        self.leave_request_repo
            .find_by_id(tenant_id, leave_id)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))?
            .ok_or(PauseServiceError::NotFound)
    }

    pub async fn list_employees(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Employee>, PauseServiceError> {
        self.employee_repo
            .list(tenant_id, limit, offset)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))
    }

    pub async fn search_employees(
        &self,
        tenant_id: &TenantId,
        query: &str,
        limit: u64,
    ) -> Result<Vec<Employee>, PauseServiceError> {
        self.employee_repo
            .search(tenant_id, query, limit)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))
    }

    pub async fn list_leave_requests(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<LeaveRequest>, PauseServiceError> {
        self.leave_request_repo
            .list(tenant_id, limit, offset)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))
    }

    pub async fn approve_leave(
        &self,
        tenant_id: &TenantId,
        leave_id: Uuid,
        reviewer_id: Uuid,
        clock: &dyn Clock,
    ) -> Result<LeaveRequest, PauseServiceError> {
        let mut request = self
            .leave_request_repo
            .find_by_id(tenant_id, leave_id)
            .await?
            .ok_or(PauseServiceError::NotFound)?;
        if request.status != LeaveStatus::Pending {
            return Err(PauseServiceError::Validation(
                "Leave request is not pending".to_string(),
            ));
        }
        let event = ataqu_domain_pause::leave::approve_leave(&mut request, reviewer_id, clock);
        self.leave_request_repo
            .update_status(
                tenant_id,
                leave_id,
                LeaveStatus::Approved,
                reviewer_id,
                clock.now(),
            )
            .await?;
        // Outbox event
        let payload =
            serde_json::to_value(&event).map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
        self.outbox
            .append(PAUSE_SCHEMA, "LeaveStatusChanged", leave_id, &payload)
            .await
            .map_err(|e| PauseServiceError::Outbox(e))?;
        Ok(request)
    }

    pub async fn reject_leave(
        &self,
        tenant_id: &TenantId,
        leave_id: Uuid,
        reviewer_id: Uuid,
        clock: &dyn Clock,
    ) -> Result<LeaveRequest, PauseServiceError> {
        let mut request = self
            .leave_request_repo
            .find_by_id(tenant_id, leave_id)
            .await?
            .ok_or(PauseServiceError::NotFound)?;
        if request.status != LeaveStatus::Pending {
            return Err(PauseServiceError::Validation(
                "Leave request is not pending".to_string(),
            ));
        }
        let event = ataqu_domain_pause::leave::reject_leave(&mut request, reviewer_id, clock);
        self.leave_request_repo
            .update_status(
                tenant_id,
                leave_id,
                LeaveStatus::Rejected,
                reviewer_id,
                clock.now(),
            )
            .await?;
        let payload =
            serde_json::to_value(&event).map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
        self.outbox
            .append(PAUSE_SCHEMA, "LeaveStatusChanged", leave_id, &payload)
            .await
            .map_err(|e| PauseServiceError::Outbox(e))?;
        Ok(request)
    }

    pub async fn update_employee(
        &self,
        tenant_id: &TenantId,
        cmd: ataqu_domain_pause::employee::UpdateEmployeeCommand,
    ) -> Result<ataqu_domain_pause::Employee, PauseServiceError> {
        let mut employee = self.find_employee(tenant_id, cmd.employee_id).await?;
        ataqu_domain_pause::employee::update_employee(&mut employee, cmd, self.clock.as_ref());
        self.employee_repo.update(tenant_id, &employee).await?;

        let payload = serde_json::json!({
            "employee_id": employee.id,
            "tenant_id": employee.tenant_id.as_uuid(),
            "full_name": employee.full_name,
        });
        self.outbox
            .append(PAUSE_SCHEMA, "EmployeeUpdated", employee.id, &payload)
            .await
            .map_err(|e| PauseServiceError::Outbox(e))?;

        Ok(employee)
    }

    pub async fn deactivate_employee(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<(), PauseServiceError> {
        let mut employee = self
            .employee_repo
            .find_by_id(tenant_id, employee_id)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))?
            .ok_or(PauseServiceError::NotFound)?;

        ataqu_domain_pause::employee::deactivate_employee(&mut employee, self.clock.as_ref());

        self.employee_repo.update(tenant_id, &employee).await?;

        let payload = serde_json::json!({
            "employee_id": employee.id,
            "tenant_id": employee.tenant_id.as_uuid(),
            "is_active": employee.is_active,
        });
        self.outbox
            .append(PAUSE_SCHEMA, "EmployeeDeactivated", employee.id, &payload)
            .await
            .map_err(|e| PauseServiceError::Outbox(e))?;
        Ok(())
    }

    pub async fn cancel_leave(
        &self,
        tenant_id: &TenantId,
        leave_id: Uuid,
        reviewer_id: Uuid,
        clock: &dyn Clock,
    ) -> Result<LeaveRequest, PauseServiceError> {
        let mut request = self
            .leave_request_repo
            .find_by_id(tenant_id, leave_id)
            .await?
            .ok_or(PauseServiceError::NotFound)?;
        if request.status != LeaveStatus::Pending {
            return Err(PauseServiceError::Validation(
                "Leave request is not pending".to_string(),
            ));
        }
        let event = ataqu_domain_pause::leave::cancel_leave(&mut request, reviewer_id, clock);
        self.leave_request_repo
            .update_status(
                tenant_id,
                leave_id,
                LeaveStatus::Cancelled,
                reviewer_id,
                clock.now(),
            )
            .await?;
        let payload =
            serde_json::to_value(&event).map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
        self.outbox
            .append(PAUSE_SCHEMA, "LeaveStatusChanged", leave_id, &payload)
            .await
            .map_err(|e| PauseServiceError::Outbox(e))?;
        Ok(request)
    }

    pub async fn upload_document(
        &self,
        cmd: ataqu_domain_pause::CreateDocumentCommand,
        id_gen: &dyn IdGenerator,
        clock: &dyn Clock,
    ) -> Result<ataqu_domain_pause::EmployeeDocument, PauseServiceError> {
        let doc = ataqu_domain_pause::EmployeeDocument {
            id: id_gen.new_uuid_v7(),
            tenant_id: cmd.tenant_id,
            employee_id: cmd.employee_id,
            file_name: cmd.file_name,
            file_url: cmd.file_url,
            doc_type: cmd.doc_type,
            created_at: clock.now().into(),
        };
        self.document_repo.save_document(&doc).await?;
        Ok(doc)
    }

    pub async fn list_documents(
        &self,
        tenant_id: TenantId,
        employee_id: Uuid,
    ) -> Result<Vec<ataqu_domain_pause::EmployeeDocument>, PauseServiceError> {
        self.document_repo
            .list_documents_for_employee(&tenant_id, employee_id)
            .await
            .map_err(PauseServiceError::Domain)
    }
}
