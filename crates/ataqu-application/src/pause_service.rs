//! PAUSE application service — HR orchestration.
//! Uses domain types and repository traits from domain crate.
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

pub use ataqu_domain_pause::{
    CreateEmployeeCommand, Employee, EmployeeCreatedEvent, LeaveRequest, LeaveRequestedEvent,
    LeaveStatus, LeaveType, PauseDomainError, RequestLeaveCommand,
};

use crate::outbox::Outbox;
use ataqu_infra_idempotency::{AcquireOutcome, CachedResponse, IdempotencyGuard, SeaOrmIdempotencyStore};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use sea_orm::DatabaseConnection;

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

pub struct PauseService {
    db: DatabaseConnection,
    employee_repo: Arc<dyn ataqu_domain_pause::repository::EmployeeRepositoryPort>,
    leave_request_repo: Arc<dyn ataqu_domain_pause::repository::LeaveRequestRepositoryPort>,
    document_repo:
        Arc<dyn ataqu_domain_pause::repository::EmployeeDocumentRepository + Send + Sync>,
    outbox: Arc<dyn Outbox + Send + Sync>,
    clock: Arc<dyn Clock>,
}

impl PauseService {
    pub fn new(
        db: DatabaseConnection,
        employee_repo: Arc<dyn ataqu_domain_pause::repository::EmployeeRepositoryPort>,
        leave_request_repo: Arc<dyn ataqu_domain_pause::repository::LeaveRequestRepositoryPort>,
        document_repo: Arc<
            dyn ataqu_domain_pause::repository::EmployeeDocumentRepository + Send + Sync,
        >,
        outbox: Arc<dyn Outbox + Send + Sync>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            db,
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
        let store = SeaOrmIdempotencyStore::new();
        let outcome = IdempotencyGuard::acquire(&self.db, command_id, Some(Box::new(store)))
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;

        match outcome {
            AcquireOutcome::Completed(cached) => {
                // Return cached response
                let value: Uuid = serde_json::from_value(cached.body)
                    .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                Ok(value)
            }
            AcquireOutcome::Proceed(guard) => {
                // Execute the operation inside the guard transaction
                let result = async {
                    let event = ataqu_domain_pause::employee::create_employee(command, id_gen, clock)?;
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
                        .map_err(PauseServiceError::Outbox)?;
                    Ok(event.employee_id)
                }.await;

                match result {
                    Ok(id) => {
                        let response_body = serde_json::to_value(id).unwrap();
                        let response = CachedResponse {
                            status: 200,
                            headers: HashMap::new(),
                            body: response_body,
                        };
                        guard.complete(response, None)
                            .await
                            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                        Ok(id)
                    }
                    Err(e) => {
                        // Check if it's a validation error (should be failed status)
                        if matches!(e, PauseServiceError::Validation(_)) {
                            guard.fail().await
                                .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                        } else {
                            guard.abort().await
                                .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                        }
                        Err(e)
                    }
                }
            }
        }
    }

    pub async fn request_leave(
        &self,
        tenant_id: &TenantId,
        command: RequestLeaveCommand,
        id_gen: &dyn IdGenerator,
        clock: &dyn Clock,
        command_id: Uuid,
    ) -> Result<Uuid, PauseServiceError> {
        let store = SeaOrmIdempotencyStore::new();
        let outcome = IdempotencyGuard::acquire(&self.db, command_id, Some(Box::new(store)))
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;

        match outcome {
            AcquireOutcome::Completed(cached) => {
                let value: Uuid = serde_json::from_value(cached.body)
                    .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                Ok(value)
            }
            AcquireOutcome::Proceed(guard) => {
                let result = async {
                    let event = ataqu_domain_pause::leave::request_leave(command, id_gen, clock);
                    self.leave_request_repo.insert(tenant_id, &event).await?;
                    let payload = serde_json::to_value(&event)
                        .map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
                    self.outbox
                        .append(
                            PAUSE_SCHEMA,
                            "LeaveRequestedEvent",
                            event.leave_request_id,
                            &payload,
                        )
                        .await
                        .map_err(PauseServiceError::Outbox)?;
                    Ok(event.leave_request_id)
                }.await;

                match result {
                    Ok(id) => {
                        let response_body = serde_json::to_value(id).unwrap();
                        let response = CachedResponse {
                            status: 200,
                            headers: HashMap::new(),
                            body: response_body,
                        };
                        guard.complete(response, None)
                            .await
                            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                        Ok(id)
                    }
                    Err(e) => {
                        if matches!(e, PauseServiceError::Validation(_)) {
                            guard.fail().await
                                .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                        } else {
                            guard.abort().await
                                .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                        }
                        Err(e)
                    }
                }
            }
        }
    }

    // ... rest of the service methods remain unchanged, only with the new struct fields.
    // We'll keep the existing methods but they will work with the new fields.

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
    ) -> Result<(Vec<Employee>, u64), PauseServiceError> {
        let total = self
            .employee_repo
            .count_employees(tenant_id)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))?;
        let employees = self
            .employee_repo
            .list(tenant_id, limit, offset)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))?;
        Ok((employees, total))
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

    pub async fn list_leave_requests_with_names(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<(Vec<(LeaveRequest, String)>, u64), PauseServiceError> {
        let total = self
            .leave_request_repo
            .count_leave_requests(tenant_id)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))?;
        let requests = self
            .leave_request_repo
            .list_with_employee_names(tenant_id, limit, offset)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))?;
        Ok((requests, total))
    }

    pub async fn approve_leave(
        &self,
        tenant_id: &TenantId,
        leave_id: Uuid,
        reviewer_id: Uuid,
        clock: &dyn Clock,
        expected_version: i32,
    ) -> Result<LeaveRequest, PauseServiceError> {
        let mut request = self
            .leave_request_repo
            .find_by_id(tenant_id, leave_id)
            .await?
            .ok_or(PauseServiceError::NotFound)?;
        if request.version != expected_version {
            return Err(PauseServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, request.version
            )));
        }
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
        let payload =
            serde_json::to_value(event).map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
        self.outbox
            .append(PAUSE_SCHEMA, "LeaveStatusChanged", leave_id, &payload)
            .await
            .map_err(PauseServiceError::Outbox)?;
        Ok(request)
    }

    pub async fn reject_leave(
        &self,
        tenant_id: &TenantId,
        leave_id: Uuid,
        reviewer_id: Uuid,
        clock: &dyn Clock,
        expected_version: i32,
    ) -> Result<LeaveRequest, PauseServiceError> {
        let mut request = self
            .leave_request_repo
            .find_by_id(tenant_id, leave_id)
            .await?
            .ok_or(PauseServiceError::NotFound)?;
        if request.version != expected_version {
            return Err(PauseServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, request.version
            )));
        }
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
            serde_json::to_value(event).map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
        self.outbox
            .append(PAUSE_SCHEMA, "LeaveStatusChanged", leave_id, &payload)
            .await
            .map_err(PauseServiceError::Outbox)?;
        Ok(request)
    }

    pub async fn update_employee(
        &self,
        tenant_id: &TenantId,
        cmd: ataqu_domain_pause::employee::UpdateEmployeeCommand,
        expected_version: i32,
    ) -> Result<ataqu_domain_pause::Employee, PauseServiceError> {
        let mut employee = self.find_employee(tenant_id, cmd.employee_id).await?;
        if employee.version != expected_version {
            return Err(PauseServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, employee.version
            )));
        }
        ataqu_domain_pause::employee::update_employee(&mut employee, cmd, self.clock.as_ref());
        employee.version += 1;
        self.employee_repo.update(tenant_id, &employee).await?;

        let payload = serde_json::json!({
            "employee_id": employee.id,
            "tenant_id": employee.tenant_id.as_uuid(),
            "full_name": employee.full_name,
        });
        self.outbox
            .append(PAUSE_SCHEMA, "EmployeeUpdated", employee.id, &payload)
            .await
            .map_err(PauseServiceError::Outbox)?;

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
            .map_err(PauseServiceError::Outbox)?;
        Ok(())
    }

    pub async fn cancel_leave(
        &self,
        tenant_id: &TenantId,
        leave_id: Uuid,
        reviewer_id: Uuid,
        clock: &dyn Clock,
        expected_version: i32,
    ) -> Result<LeaveRequest, PauseServiceError> {
        let mut request = self
            .leave_request_repo
            .find_by_id(tenant_id, leave_id)
            .await?
            .ok_or(PauseServiceError::NotFound)?;
        if request.version != expected_version {
            return Err(PauseServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, request.version
            )));
        }
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
            serde_json::to_value(event).map_err(|e| PauseServiceError::Outbox(e.to_string()))?;
        self.outbox
            .append(PAUSE_SCHEMA, "LeaveStatusChanged", leave_id, &payload)
            .await
            .map_err(PauseServiceError::Outbox)?;
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
        limit: u64,
        offset: u64,
    ) -> Result<Vec<ataqu_domain_pause::EmployeeDocument>, PauseServiceError> {
        self.document_repo
            .list_documents_for_employee(&tenant_id, employee_id, limit, offset)
            .await
            .map_err(PauseServiceError::Domain)
    }
}
