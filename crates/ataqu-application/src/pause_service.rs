//! PAUSE application service — HR orchestration.
//!
//! Implements employee onboarding and leave request workflows following
//! ADR-017 (Pure Domain Model with Application-Layer Orchestration) and
//! ADR-006 (Idempotency via Advisory Locks & Durable Response Storage).
//!
//! # Flow (ADR-017)
//!
//! 1. Acquire `IdempotencyGuard` (advisory lock + SeaORM transaction)
//! 2. Inject `IdGenerator` and `Clock` into domain pure function
//! 3. Call domain pure function → events
//! 4. Call repository to persist events (same txn)
//! 5. Append to `core.outbox` (same txn)
//! 6. Update idempotency record (same txn)
//! 7. Commit → release advisory lock
//!
//! # PII Note
//!
//! PII fields (email, phone) are wrapped in redacting newtypes (ADR-007).
//! The application layer never calls `reveal()`. PII newtypes are passed
//! through to infrastructure for encryption-at-rest and to the API layer
//! for serialization via wrapper structs (`ApiEmail`, etc.).

use std::sync::Arc;
use std::time::SystemTime;

use chrono::{DateTime, Utc};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::instrument;
use uuid::Uuid;

// ============================================================================
// CONSTANTS
// ============================================================================

/// Schema identifier for PAUSE domain events in the unified outbox.
///
/// PAUSE is in the `collab_ops` schema per the database layout
/// (Section 3.2 of the architecture document).
pub const PAUSE_SCHEMA: &str = "collab_ops";

// ============================================================================
// KERNEL TYPES
// ============================================================================
// NOTE: In the full workspace, these are imported from `ataqu-kernel`.
// They are defined here so the crate compiles independently. When
// `ataqu-kernel` is available, replace with:
//   use ataqu_kernel::{Clock, IdGenerator, TenantId};

/// Tenant identifier newtype with private field (ADR-024).
///
/// Enforces tenant isolation at the type level — the inner `Uuid`
/// cannot be accessed without going through `as_uuid()`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TenantId(Uuid);

impl TenantId {
    /// Creates a new `TenantId` from a `Uuid`.
    pub fn new(uuid: Uuid) -> Self {
        Self(uuid)
    }

    /// Returns the inner `Uuid`.
    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

/// Impure capability for generating UUIDs (ADR-013).
///
/// Injected into domain functions for testability.
/// Domain never calls `Uuid::new_v7()` directly.
pub trait IdGenerator: Send + Sync {
    /// Generates a new UUIDv7 (time-ordered).
    fn new_uuid_v7(&self) -> Uuid;
}

/// Impure capability for reading the system clock (ADR-013).
///
/// Injected into domain functions for testability.
/// Domain never calls `SystemTime::now()` directly.
pub trait Clock: Send + Sync {
    /// Returns the current `SystemTime` at high precision.
    fn now(&self) -> SystemTime;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/// Errors that can occur during PAUSE service operations.
#[derive(Debug, Error)]
pub enum PauseServiceError {
    /// Domain-level validation error (e.g., invalid dates, missing fields).
    ///
    /// Maps to HTTP 422. The idempotency record is marked as `failed`
    /// so subsequent retries with the same key receive 409 Conflict.
    #[error("validation error: {0}")]
    Validation(String),

    /// Persistence or database error.
    ///
    /// Maps to HTTP 500 or 503 (if transient). The transaction is rolled back.
    #[error("persistence error: {0}")]
    Persistence(String),

    /// Outbox append failure.
    ///
    /// Maps to HTTP 500. The transaction is rolled back.
    #[error("outbox error: {0}")]
    Outbox(String),

    /// Idempotency guard failure (lock timeout, stale record, etc.).
    ///
    /// Maps to HTTP 503 with `Retry-After` header (ADR-006).
    #[error("idempotency error: {0}")]
    Idempotency(String),
}

// ============================================================================
// DOMAIN TYPES
// ============================================================================
// NOTE: In the full workspace, these are imported from `ataqu-contracts`
// and `ataqu-domain-pause`. They are defined here so the crate compiles
// independently.

/// Command to create a new employee.
#[derive(Debug, Clone)]
pub struct CreateEmployeeCommand {
    pub name: String,
    pub department: String,
    pub position: String,
    pub hire_date: SystemTime,
}

/// Event emitted when an employee is created.
///
/// This event is appended to `core.outbox` for CINQ projection consumption.
/// CINQ consumes `EmployeeCreatedV1` to create contact records (ADR-004).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EmployeeCreatedV1 {
    pub employee_id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub department: String,
    pub position: String,
    pub hire_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// Command to request leave.
#[derive(Debug, Clone)]
pub struct RequestLeaveCommand {
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: SystemTime,
    pub end_date: SystemTime,
    pub reason: Option<String>,
}

/// Event emitted when a leave request is submitted.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LeaveRequestedV1 {
    pub leave_request_id: Uuid,
    pub tenant_id: Uuid,
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/// Result of an employee creation operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CreateEmployeeResult {
    pub employee_id: Uuid,
}

/// Result of a leave request operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RequestLeaveResult {
    pub leave_request_id: Uuid,
}

// ============================================================================
// PORTS (Interfaces)
// ============================================================================
// These traits define the application layer's dependencies on infrastructure.
// The real implementations live in `ataqu-infra-repositories` and
// `ataqu-infra-idempotency`. Tests use mock implementations.

/// Idempotency guard handle returned by [`IdempotencyPort::acquire`].
///
/// If `is_cached()` returns `true`, the command was previously completed
/// and the cached response can be retrieved via [`get_cached`](Self::get_cached).
/// Otherwise, the service performs the domain work and calls
/// [`IdempotencyPort::commit`] on success or [`IdempotencyPort::rollback`] on failure.
#[derive(Debug, Clone)]
pub struct IdempotencyGuardHandle {
    cached_response: Option<serde_json::Value>,
}

impl IdempotencyGuardHandle {
    /// Creates a new handle with an optional cached response.
    pub fn new(cached_response: Option<serde_json::Value>) -> Self {
        Self { cached_response }
    }

    /// Returns `true` if a cached response exists for this command.
    pub fn is_cached(&self) -> bool {
        self.cached_response.is_some()
    }

    /// Deserializes and returns the cached response.
    ///
    /// # Errors
    /// Returns `PauseServiceError::Idempotency` if no cached response exists
    /// or if deserialization fails.
    pub fn get_cached<T: DeserializeOwned>(&self) -> Result<T, PauseServiceError> {
        let value = self
            .cached_response
            .as_ref()
            .ok_or_else(|| PauseServiceError::Idempotency("no cached response".into()))?;
        serde_json::from_value(value.clone())
            .map_err(|e| PauseServiceError::Idempotency(format!("cache deserialization: {e}")))
    }
}

/// Port for idempotency guard operations (ADR-006).
///
/// Encapsulates the full idempotency flow:
/// 1. Moka cache check (hot path)
/// 2. Advisory lock acquisition (`pg_advisory_xact_lock`)
/// 3. Idempotency record check/insert
/// 4. Commit or rollback
///
/// The real implementation lives in `ataqu-infra-idempotency`.
#[async_trait::async_trait]
pub trait IdempotencyPort: Send + Sync {
    /// Acquires the idempotency guard for the given command.
    ///
    /// If the command was previously completed, the returned handle
    /// will contain the cached response.
    async fn acquire(&self, command_id: &Uuid)
    -> Result<IdempotencyGuardHandle, PauseServiceError>;

    /// Commits the transaction and stores the response durably.
    ///
    /// Called after the domain work succeeds. Stores the serialized
    /// response in `core.idempotency_records` and inserts into Moka.
    async fn commit(
        &self,
        command_id: &Uuid,
        response_body: serde_json::Value,
    ) -> Result<(), PauseServiceError>;

    /// Rolls back the transaction on failure.
    ///
    /// Called when the domain work fails. Rolls back the SeaORM transaction
    /// and releases the advisory lock.
    async fn rollback(&self, command_id: &Uuid) -> Result<(), PauseServiceError>;
}

/// Port for employee repository operations.
///
/// The real implementation lives in `ataqu-infra-repositories::pause`.
#[async_trait::async_trait]
pub trait EmployeeRepositoryPort: Send + Sync {
    /// Inserts a new employee record within the current transaction.
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &EmployeeCreatedV1,
    ) -> Result<(), PauseServiceError>;
}

/// Port for leave request repository operations.
///
/// The real implementation lives in `ataqu-infra-repositories::pause`.
#[async_trait::async_trait]
pub trait LeaveRequestRepositoryPort: Send + Sync {
    /// Inserts a new leave request record within the current transaction.
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &LeaveRequestedV1,
    ) -> Result<(), PauseServiceError>;
}

/// Port for appending events to the unified outbox (`core.outbox`).
///
/// The real implementation lives in `ataqu-infra-repositories`.
/// After inserting into `core.outbox`, the implementation issues
/// `pg_notify('outbox_event', ...)` on the same transaction.
#[async_trait::async_trait]
pub trait OutboxPort: Send + Sync {
    /// Appends an event to `core.outbox` and issues `pg_notify`.
    ///
    /// # Arguments
    /// * `schema` - The schema identifier (e.g., `PAUSE_SCHEMA`)
    /// * `event_type` - The event type string (e.g., `"EmployeeCreatedV1"`)
    /// * `aggregate_id` - The aggregate root UUID
    /// * `payload` - The serialized event payload as JSON
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

/// Validates a `CreateEmployeeCommand` before domain execution.
///
/// Returns `PauseServiceError::Validation` if any field is invalid.
/// This is called before the pure domain function to ensure the
/// command is well-formed (ADR-017 type-state flow).
fn validate_create_employee(cmd: &CreateEmployeeCommand) -> Result<(), PauseServiceError> {
    if cmd.name.trim().is_empty() {
        return Err(PauseServiceError::Validation(
            "employee name cannot be empty".into(),
        ));
    }
    if cmd.department.trim().is_empty() {
        return Err(PauseServiceError::Validation(
            "department cannot be empty".into(),
        ));
    }
    if cmd.position.trim().is_empty() {
        return Err(PauseServiceError::Validation(
            "position cannot be empty".into(),
        ));
    }
    Ok(())
}

/// Validates a `RequestLeaveCommand` before domain execution.
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
// DOMAIN PURE FUNCTIONS
// ============================================================================
// These are pure functions: no I/O, no system clock/RNG reads.
// All impure capabilities are injected (ADR-013, ADR-017).

/// Creates an employee by generating IDs and timestamps via injected capabilities.
///
/// # Purity
/// This function is pure — it performs no I/O and reads no system state.
/// The `IdGenerator` and `Clock` are injected capabilities (ADR-013).
///
/// # Panics
/// This function does not panic. All impure operations are delegated to
/// the injected `IdGenerator` and `Clock` capabilities.
fn create_employee(
    cmd: CreateEmployeeCommand,
    tenant_id: &TenantId,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
) -> EmployeeCreatedV1 {
    let employee_id = id_gen.new_uuid_v7();
    let created_at: DateTime<Utc> = clock.now().into();
    let hire_date: DateTime<Utc> = cmd.hire_date.into();

    EmployeeCreatedV1 {
        employee_id,
        tenant_id: tenant_id.as_uuid(),
        name: cmd.name,
        department: cmd.department,
        position: cmd.position,
        hire_date,
        created_at,
    }
}

/// Requests leave by generating IDs and timestamps via injected capabilities.
///
/// # Purity
/// This function is pure — it performs no I/O and reads no system state.
fn request_leave(
    cmd: RequestLeaveCommand,
    tenant_id: &TenantId,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
) -> LeaveRequestedV1 {
    let leave_request_id = id_gen.new_uuid_v7();
    let created_at: DateTime<Utc> = clock.now().into();
    let start_date: DateTime<Utc> = cmd.start_date.into();
    let end_date: DateTime<Utc> = cmd.end_date.into();

    LeaveRequestedV1 {
        leave_request_id,
        tenant_id: tenant_id.as_uuid(),
        employee_id: cmd.employee_id,
        leave_type: cmd.leave_type,
        start_date,
        end_date,
        reason: cmd.reason,
        created_at,
    }
}

// ============================================================================
// SERVICE
// ============================================================================

/// PAUSE application service — orchestrates HR operations.
///
/// This service is the application-layer entry point for all PAUSE (HR) operations.
/// It follows the strict orchestration pattern defined in ADR-017:
///
/// 1. Acquire `IdempotencyGuard` (advisory lock + SeaORM transaction)
/// 2. Inject `IdGenerator` and `Clock` into domain pure functions
/// 3. Persist events via repositories (same transaction)
/// 4. Append projection events to `core.outbox` (same transaction)
/// 5. Commit → release advisory lock
///
/// # Thread Safety
///
/// `PauseService` is `Send + Sync` because all its fields are `Arc<dyn ...>`.
/// It can be safely shared across Tokio tasks.
pub struct PauseService {
    idempotency: Arc<dyn IdempotencyPort>,
    employee_repo: Arc<dyn EmployeeRepositoryPort>,
    leave_request_repo: Arc<dyn LeaveRequestRepositoryPort>,
    outbox: Arc<dyn OutboxPort>,
}

impl PauseService {
    /// Creates a new `PauseService`.
    ///
    /// # Arguments
    /// * `idempotency` - The idempotency guard port
    /// * `employee_repo` - The employee repository port
    /// * `leave_request_repo` - The leave request repository port
    /// * `outbox` - The outbox append port
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

    /// Onboards a new employee.
    ///
    /// This method follows the strict idempotency flow (ADR-017, ADR-006):
    ///
    /// 1. Acquires idempotency guard (advisory lock + transaction)
    /// 2. If cached, returns the previous response without re-executing
    /// 3. Validates the command
    /// 4. Calls pure domain function `create_employee` with injected `IdGenerator` and `Clock`
    /// 5. Persists the employee via `EmployeeRepositoryPort`
    /// 6. Appends `EmployeeCreatedV1` to `core.outbox` for CINQ projection
    /// 7. Commits the transaction and stores the response
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier for multi-tenant isolation
    /// * `command` - The create-employee command
    /// * `id_gen` - Injected `IdGenerator` capability (for UUIDv7 generation)
    /// * `clock` - Injected `Clock` capability (for high-precision `SystemTime`)
    /// * `command_id` - Deterministic idempotency key (UUIDv5 from `Idempotency-Key` header)
    ///
    /// # Returns
    /// * `Ok(CreateEmployeeResult)` — The created employee ID
    /// * `Err(PauseServiceError)` — On validation, persistence, outbox, or idempotency failure
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
        // Step 1: Acquire idempotency guard (advisory lock + transaction)
        let guard = self.idempotency.acquire(&command_id).await?;

        // Step 2: Check for cached response (idempotency hot path)
        if guard.is_cached() {
            tracing::debug!(command_id = %command_id, "returning cached idempotency response");
            return guard.get_cached::<CreateEmployeeResult>();
        }

        // Steps 3-6: Validate → Domain work → Persist → Outbox
        let result = self
            .do_create_employee(tenant_id, command, id_gen, clock)
            .await;

        // Step 7: Commit or rollback
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

    /// Internal helper: performs the actual employee creation domain work.
    ///
    /// This method:
    /// 1. Validates the command
    /// 2. Calls the pure domain function `create_employee` with injected capabilities
    /// 3. Persists the employee via `EmployeeRepositoryPort`
    /// 4. Appends `EmployeeCreatedV1` to `core.outbox` for CINQ projection
    async fn do_create_employee(
        &self,
        tenant_id: &TenantId,
        command: CreateEmployeeCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
    ) -> Result<CreateEmployeeResult, PauseServiceError> {
        // Step 3: Validate command
        validate_create_employee(&command)?;

        // Step 4: Call pure domain function with injected capabilities
        let event = create_employee(command, tenant_id, id_gen, clock);

        // Step 5: Persist employee via repository (same transaction)
        self.employee_repo.insert(tenant_id, &event).await?;

        // Step 6: Append EmployeeCreatedV1 to core.outbox for CINQ projection
        let payload = serde_json::to_value(&event)
            .map_err(|e| PauseServiceError::Outbox(format!("serialization: {e}")))?;

        self.outbox
            .append(
                PAUSE_SCHEMA,
                "EmployeeCreatedV1",
                event.employee_id,
                &payload,
            )
            .await?;

        Ok(CreateEmployeeResult {
            employee_id: event.employee_id,
        })
    }

    /// Submits a leave request for an employee.
    ///
    /// This method follows the strict idempotency flow (ADR-017, ADR-006):
    ///
    /// 1. Acquires idempotency guard (advisory lock + transaction)
    /// 2. If cached, returns the previous response without re-executing
    /// 3. Validates the command
    /// 4. Calls pure domain function `request_leave` with injected `IdGenerator` and `Clock`
    /// 5. Persists the leave request via `LeaveRequestRepositoryPort`
    /// 6. Appends `LeaveRequestedV1` to `core.outbox`
    /// 7. Commits the transaction and stores the response
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier for multi-tenant isolation
    /// * `command` - The request-leave command
    /// * `id_gen` - Injected `IdGenerator` capability
    /// * `clock` - Injected `Clock` capability
    /// * `command_id` - Deterministic idempotency key (UUIDv5 from `Idempotency-Key` header)
    ///
    /// # Returns
    /// * `Ok(RequestLeaveResult)` — The created leave request ID
    /// * `Err(PauseServiceError)` — On validation, persistence, outbox, or idempotency failure
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
        // Step 1: Acquire idempotency guard
        let guard = self.idempotency.acquire(&command_id).await?;

        // Step 2: Check for cached response
        if guard.is_cached() {
            tracing::debug!(command_id = %command_id, "returning cached idempotency response");
            return guard.get_cached::<RequestLeaveResult>();
        }

        // Steps 3-6: Validate → Domain work → Persist → Outbox
        let result = self
            .do_request_leave(tenant_id, command, id_gen, clock)
            .await;

        // Step 7: Commit or rollback
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

    /// Internal helper: performs the actual leave request domain work.
    async fn do_request_leave(
        &self,
        tenant_id: &TenantId,
        command: RequestLeaveCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
    ) -> Result<RequestLeaveResult, PauseServiceError> {
        // Step 3: Validate command
        validate_request_leave(&command)?;

        // Step 4: Call pure domain function
        let event = request_leave(command, tenant_id, id_gen, clock);

        // Step 5: Persist leave request
        self.leave_request_repo.insert(tenant_id, &event).await?;

        // Step 6: Append LeaveRequestedV1 to core.outbox
        let payload = serde_json::to_value(&event)
            .map_err(|e| PauseServiceError::Outbox(format!("serialization: {e}")))?;

        self.outbox
            .append(
                PAUSE_SCHEMA,
                "LeaveRequestedV1",
                event.leave_request_id,
                &payload,
            )
            .await?;

        Ok(RequestLeaveResult {
            leave_request_id: event.leave_request_id,
        })
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // ---- Mock Implementations ----

    struct MockIdGenerator {
        uuid: Uuid,
    }

    impl IdGenerator for MockIdGenerator {
        fn new_uuid_v7(&self) -> Uuid {
            self.uuid
        }
    }

    struct MockClock {
        now: SystemTime,
    }

    impl Clock for MockClock {
        fn now(&self) -> SystemTime {
            self.now
        }
    }

    #[derive(Debug, Clone, PartialEq)]
    struct OutboxCall {
        schema: String,
        event_type: String,
        aggregate_id: Uuid,
        payload: serde_json::Value,
    }

    struct MockOutboxPort {
        calls: Mutex<Vec<OutboxCall>>,
        should_fail: bool,
    }

    impl MockOutboxPort {
        fn new() -> Self {
            Self {
                calls: Mutex::new(Vec::new()),
                should_fail: false,
            }
        }

        fn with_failure() -> Self {
            Self {
                calls: Mutex::new(Vec::new()),
                should_fail: true,
            }
        }

        fn calls(&self) -> Vec<OutboxCall> {
            self.calls.lock().unwrap().clone()
        }
    }

    #[async_trait::async_trait]
    impl OutboxPort for MockOutboxPort {
        async fn append(
            &self,
            schema: &str,
            event_type: &str,
            aggregate_id: Uuid,
            payload: &serde_json::Value,
        ) -> Result<(), PauseServiceError> {
            if self.should_fail {
                return Err(PauseServiceError::Outbox("mock outbox failure".into()));
            }
            self.calls.lock().unwrap().push(OutboxCall {
                schema: schema.to_string(),
                event_type: event_type.to_string(),
                aggregate_id,
                payload: payload.clone(),
            });
            Ok(())
        }
    }

    #[derive(Debug, Clone, PartialEq)]
    struct EmployeeInsertCall {
        tenant_id: Uuid,
        event: EmployeeCreatedV1,
    }

    struct MockEmployeeRepository {
        calls: Mutex<Vec<EmployeeInsertCall>>,
        should_fail: bool,
    }

    impl MockEmployeeRepository {
        fn new() -> Self {
            Self {
                calls: Mutex::new(Vec::new()),
                should_fail: false,
            }
        }

        fn with_failure() -> Self {
            Self {
                calls: Mutex::new(Vec::new()),
                should_fail: true,
            }
        }

        fn calls(&self) -> Vec<EmployeeInsertCall> {
            self.calls.lock().unwrap().clone()
        }
    }

    #[async_trait::async_trait]
    impl EmployeeRepositoryPort for MockEmployeeRepository {
        async fn insert(
            &self,
            tenant_id: &TenantId,
            event: &EmployeeCreatedV1,
        ) -> Result<(), PauseServiceError> {
            if self.should_fail {
                return Err(PauseServiceError::Persistence("mock insert failure".into()));
            }
            self.calls.lock().unwrap().push(EmployeeInsertCall {
                tenant_id: tenant_id.as_uuid(),
                event: event.clone(),
            });
            Ok(())
        }
    }

    #[derive(Debug, Clone, PartialEq)]
    struct LeaveInsertCall {
        tenant_id: Uuid,
        event: LeaveRequestedV1,
    }

    struct MockLeaveRequestRepository {
        calls: Mutex<Vec<LeaveInsertCall>>,
        should_fail: bool,
    }

    impl MockLeaveRequestRepository {
        fn new() -> Self {
            Self {
                calls: Mutex::new(Vec::new()),
                should_fail: false,
            }
        }

        fn with_failure() -> Self {
            Self {
                calls: Mutex::new(Vec::new()),
                should_fail: true,
            }
        }

        fn calls(&self) -> Vec<LeaveInsertCall> {
            self.calls.lock().unwrap().clone()
        }
    }

    #[async_trait::async_trait]
    impl LeaveRequestRepositoryPort for MockLeaveRequestRepository {
        async fn insert(
            &self,
            tenant_id: &TenantId,
            event: &LeaveRequestedV1,
        ) -> Result<(), PauseServiceError> {
            if self.should_fail {
                return Err(PauseServiceError::Persistence("mock insert failure".into()));
            }
            self.calls.lock().unwrap().push(LeaveInsertCall {
                tenant_id: tenant_id.as_uuid(),
                event: event.clone(),
            });
            Ok(())
        }
    }

    struct MockIdempotencyPort {
        cached_response: Mutex<Option<serde_json::Value>>,
        acquire_count: Mutex<usize>,
        commit_count: Mutex<usize>,
        rollback_count: Mutex<usize>,
    }

    impl MockIdempotencyPort {
        fn new() -> Self {
            Self {
                cached_response: Mutex::new(None),
                acquire_count: Mutex::new(0),
                commit_count: Mutex::new(0),
                rollback_count: Mutex::new(0),
            }
        }

        fn with_cached_response(response: serde_json::Value) -> Self {
            Self {
                cached_response: Mutex::new(Some(response)),
                acquire_count: Mutex::new(0),
                commit_count: Mutex::new(0),
                rollback_count: Mutex::new(0),
            }
        }

        fn acquire_count(&self) -> usize {
            *self.acquire_count.lock().unwrap()
        }

        fn commit_count(&self) -> usize {
            *self.commit_count.lock().unwrap()
        }

        fn rollback_count(&self) -> usize {
            *self.rollback_count.lock().unwrap()
        }
    }

    #[async_trait::async_trait]
    impl IdempotencyPort for MockIdempotencyPort {
        async fn acquire(
            &self,
            _command_id: &Uuid,
        ) -> Result<IdempotencyGuardHandle, PauseServiceError> {
            *self.acquire_count.lock().unwrap() += 1;
            let cached = self.cached_response.lock().unwrap().clone();
            Ok(IdempotencyGuardHandle::new(cached))
        }

        async fn commit(
            &self,
            _command_id: &Uuid,
            _response_body: serde_json::Value,
        ) -> Result<(), PauseServiceError> {
            *self.commit_count.lock().unwrap() += 1;
            Ok(())
        }

        async fn rollback(&self, _command_id: &Uuid) -> Result<(), PauseServiceError> {
            *self.rollback_count.lock().unwrap() += 1;
            Ok(())
        }
    }

    // ---- Test Helpers ----

    fn test_tenant_id() -> TenantId {
        TenantId::new(Uuid::new_v4())
    }

    fn test_command_id() -> Uuid {
        Uuid::new_v4()
    }

    fn test_employee_id() -> Uuid {
        Uuid::new_v4()
    }

    fn test_mock_id_gen() -> MockIdGenerator {
        MockIdGenerator {
            uuid: Uuid::new_v4(),
        }
    }

    fn test_mock_clock() -> MockClock {
        MockClock {
            now: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(1_700_000_000),
        }
    }

    // ---- Domain Pure Function Tests ----

    #[test]
    fn test_create_employee_uses_injected_id_generator() {
        let expected_id = Uuid::new_v4();
        let id_gen = MockIdGenerator { uuid: expected_id };
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let cmd = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        let event = create_employee(cmd, &tenant_id, &id_gen, &clock);

        assert_eq!(event.employee_id, expected_id);
    }

    #[test]
    fn test_create_employee_uses_injected_clock() {
        let id_gen = test_mock_id_gen();
        let expected_now = SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(1_234_567);
        let clock = MockClock { now: expected_now };
        let tenant_id = test_tenant_id();
        let cmd = CreateEmployeeCommand {
            name: "Bob".into(),
            department: "Sales".into(),
            position: "Account Executive".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        let event = create_employee(cmd, &tenant_id, &id_gen, &clock);

        let expected_dt: DateTime<Utc> = expected_now.into();
        assert_eq!(event.created_at, expected_dt);
    }

    #[test]
    fn test_create_employee_preserves_command_fields() {
        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let cmd = CreateEmployeeCommand {
            name: "Charlie".into(),
            department: "Marketing".into(),
            position: "Content Lead".into(),
            hire_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(31_536_000),
        };

        let event = create_employee(cmd, &tenant_id, &id_gen, &clock);

        assert_eq!(event.name, "Charlie");
        assert_eq!(event.department, "Marketing");
        assert_eq!(event.position, "Content Lead");
        assert_eq!(event.tenant_id, tenant_id.as_uuid());
    }

    #[test]
    fn test_request_leave_uses_injected_capabilities() {
        let expected_id = Uuid::new_v4();
        let id_gen = MockIdGenerator { uuid: expected_id };
        let expected_now = SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(2_000_000_000);
        let clock = MockClock { now: expected_now };
        let tenant_id = test_tenant_id();
        let employee_id = test_employee_id();
        let cmd = RequestLeaveCommand {
            employee_id,
            leave_type: "vacation".into(),
            start_date: SystemTime::UNIX_EPOCH,
            end_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86_400),
            reason: Some("Family trip".into()),
        };

        let event = request_leave(cmd, &tenant_id, &id_gen, &clock);

        assert_eq!(event.leave_request_id, expected_id);
        let expected_dt: DateTime<Utc> = expected_now.into();
        assert_eq!(event.created_at, expected_dt);
        assert_eq!(event.employee_id, employee_id);
        assert_eq!(event.leave_type, "vacation");
        assert_eq!(event.reason, Some("Family trip".to_string()));
    }

    // ---- Validation Tests ----

    #[test]
    fn test_validate_create_employee_rejects_empty_name() {
        let cmd = CreateEmployeeCommand {
            name: "  ".into(),
            department: "Engineering".into(),
            position: "Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };
        let result = validate_create_employee(&cmd);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            PauseServiceError::Validation(_)
        ));
    }

    #[test]
    fn test_validate_create_employee_rejects_empty_department() {
        let cmd = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "".into(),
            position: "Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };
        assert!(validate_create_employee(&cmd).is_err());
    }

    #[test]
    fn test_validate_create_employee_rejects_empty_position() {
        let cmd = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };
        assert!(validate_create_employee(&cmd).is_err());
    }

    #[test]
    fn test_validate_create_employee_accepts_valid_command() {
        let cmd = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };
        assert!(validate_create_employee(&cmd).is_ok());
    }

    #[test]
    fn test_validate_request_leave_rejects_empty_leave_type() {
        let cmd = RequestLeaveCommand {
            employee_id: test_employee_id(),
            leave_type: "".into(),
            start_date: SystemTime::UNIX_EPOCH,
            end_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86_400),
            reason: None,
        };
        assert!(validate_request_leave(&cmd).is_err());
    }

    #[test]
    fn test_validate_request_leave_rejects_end_before_start() {
        let cmd = RequestLeaveCommand {
            employee_id: test_employee_id(),
            leave_type: "vacation".into(),
            start_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86_400),
            end_date: SystemTime::UNIX_EPOCH,
            reason: None,
        };
        assert!(validate_request_leave(&cmd).is_err());
    }

    #[test]
    fn test_validate_request_leave_accepts_valid_command() {
        let cmd = RequestLeaveCommand {
            employee_id: test_employee_id(),
            leave_type: "vacation".into(),
            start_date: SystemTime::UNIX_EPOCH,
            end_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86_400),
            reason: None,
        };
        assert!(validate_request_leave(&cmd).is_ok());
    }

    // ---- Service Tests: Employee Creation ----

    #[tokio::test]
    async fn test_create_employee_success() {
        let idempotency = MockIdempotencyPort::new();
        let employee_repo = MockEmployeeRepository::new();
        let leave_repo = MockLeaveRequestRepository::new();
        let outbox = MockOutboxPort::new();

        let service = PauseService::new(
            Arc::new(idempotency),
            Arc::new(employee_repo),
            Arc::new(leave_repo),
            Arc::new(outbox),
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        let result = service
            .create_employee(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await;

        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.employee_id, id_gen.uuid);
    }

    #[tokio::test]
    async fn test_create_employee_emits_outbox_event() {
        let idempotency = MockIdempotencyPort::new();
        let employee_repo = MockEmployeeRepository::new();
        let leave_repo = MockLeaveRequestRepository::new();
        let outbox = Arc::new(MockOutboxPort::new());
        let outbox_clone = Arc::clone(&outbox);

        let service = PauseService::new(
            Arc::new(idempotency),
            Arc::new(employee_repo),
            Arc::new(leave_repo),
            outbox_clone,
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        let result = service
            .create_employee(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await
            .unwrap();

        let calls = outbox.calls();
        assert_eq!(calls.len(), 1, "exactly one outbox event should be emitted");

        let call = &calls[0];
        assert_eq!(call.schema, PAUSE_SCHEMA, "schema should be collab_ops");
        assert_eq!(
            call.event_type, "EmployeeCreatedV1",
            "event type should be EmployeeCreatedV1"
        );
        assert_eq!(
            call.aggregate_id, result.employee_id,
            "aggregate_id should match employee_id"
        );

        // Verify payload contains the expected fields
        let payload = &call.payload;
        assert_eq!(payload["employee_id"], result.employee_id.to_string());
        assert_eq!(payload["name"], "Alice");
        assert_eq!(payload["department"], "Engineering");
    }

    #[tokio::test]
    async fn test_create_employee_persists_employee() {
        let idempotency = MockIdempotencyPort::new();
        let employee_repo = Arc::new(MockEmployeeRepository::new());
        let employee_repo_clone = Arc::clone(&employee_repo);
        let leave_repo = MockLeaveRequestRepository::new();
        let outbox = MockOutboxPort::new();

        let service = PauseService::new(
            Arc::new(idempotency),
            employee_repo_clone,
            Arc::new(leave_repo),
            Arc::new(outbox),
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        service
            .create_employee(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await
            .unwrap();

        let calls = employee_repo.calls();
        assert_eq!(calls.len(), 1, "employee repo should be called once");
        assert_eq!(calls[0].tenant_id, tenant_id.as_uuid());
        assert_eq!(calls[0].event.name, "Alice");
    }

    #[tokio::test]
    async fn test_create_employee_idempotency_cached() {
        let cached_result = CreateEmployeeResult {
            employee_id: Uuid::new_v4(),
        };
        let cached_json = serde_json::to_value(&cached_result).unwrap();

        let idempotency = MockIdempotencyPort::with_cached_response(cached_json);
        let employee_repo = Arc::new(MockEmployeeRepository::new());
        let employee_repo_clone = Arc::clone(&employee_repo);
        let leave_repo = MockLeaveRequestRepository::new();
        let outbox = Arc::new(MockOutboxPort::new());
        let outbox_clone = Arc::clone(&outbox);

        let service = PauseService::new(
            Arc::new(idempotency),
            employee_repo_clone,
            Arc::new(leave_repo),
            outbox_clone,
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        let result = service
            .create_employee(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await
            .unwrap();

        // Should return cached result
        assert_eq!(result.employee_id, cached_result.employee_id);

        // Should NOT have called employee repository
        assert!(
            employee_repo.calls().is_empty(),
            "employee repo should not be called for cached response"
        );

        // Should NOT have called outbox
        assert!(
            outbox.calls().is_empty(),
            "outbox should not be called for cached response"
        );
    }

    #[tokio::test]
    async fn test_create_employee_persistence_error_propagates() {
        let idempotency = Arc::new(MockIdempotencyPort::new());
        let idempotency_clone = Arc::clone(&idempotency);

        let service = PauseService::new(
            idempotency_clone,
            Arc::new(MockEmployeeRepository::with_failure()),
            Arc::new(MockLeaveRequestRepository::new()),
            Arc::new(MockOutboxPort::new()),
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        let result = service
            .create_employee(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await;

        assert!(
            result.is_err(),
            "should return error on persistence failure"
        );
        let err = result.unwrap_err();
        assert!(
            matches!(err, PauseServiceError::Persistence(_)),
            "should be a persistence error, got: {err:?}"
        );

        // Rollback should have been called
        assert_eq!(
            idempotency.rollback_count(),
            1,
            "rollback should be called on error"
        );
        assert_eq!(
            idempotency.commit_count(),
            0,
            "commit should not be called on error"
        );
    }

    #[tokio::test]
    async fn test_create_employee_outbox_error_propagates() {
        let idempotency = Arc::new(MockIdempotencyPort::new());
        let idempotency_clone = Arc::clone(&idempotency);

        let service = PauseService::new(
            idempotency_clone,
            Arc::new(MockEmployeeRepository::new()),
            Arc::new(MockLeaveRequestRepository::new()),
            Arc::new(MockOutboxPort::with_failure()),
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        let result = service
            .create_employee(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await;

        assert!(result.is_err(), "should return error on outbox failure");
        let err = result.unwrap_err();
        assert!(
            matches!(err, PauseServiceError::Outbox(_)),
            "should be an outbox error, got: {err:?}"
        );

        // Rollback should have been called
        assert_eq!(
            idempotency.rollback_count(),
            1,
            "rollback should be called on error"
        );
    }

    #[tokio::test]
    async fn test_create_employee_validation_error_propagates() {
        let idempotency = Arc::new(MockIdempotencyPort::new());
        let idempotency_clone = Arc::clone(&idempotency);

        let employee_repo = Arc::new(MockEmployeeRepository::new());
        let employee_repo_clone = Arc::clone(&employee_repo);

        let service = PauseService::new(
            idempotency_clone,
            employee_repo_clone,
            Arc::new(MockLeaveRequestRepository::new()),
            Arc::new(MockOutboxPort::new()),
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = CreateEmployeeCommand {
            name: "".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        let result = service
            .create_employee(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await;

        assert!(result.is_err(), "should return error on validation failure");
        assert!(
            matches!(result.unwrap_err(), PauseServiceError::Validation(_)),
            "should be a validation error"
        );

        // Employee repo should NOT have been called (validation happens before persist)
        assert!(
            employee_repo.calls().is_empty(),
            "employee repo should not be called on validation failure"
        );

        // Rollback should have been called
        assert_eq!(
            idempotency.rollback_count(),
            1,
            "rollback should be called on validation error"
        );
    }

    // ---- Service Tests: Leave Requests ----

    #[tokio::test]
    async fn test_request_leave_success() {
        let idempotency = MockIdempotencyPort::new();
        let employee_repo = MockEmployeeRepository::new();
        let leave_repo = MockLeaveRequestRepository::new();
        let outbox = MockOutboxPort::new();

        let service = PauseService::new(
            Arc::new(idempotency),
            Arc::new(employee_repo),
            Arc::new(leave_repo),
            Arc::new(outbox),
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = RequestLeaveCommand {
            employee_id: test_employee_id(),
            leave_type: "vacation".into(),
            start_date: SystemTime::UNIX_EPOCH,
            end_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86400 * 5),
            reason: Some("Annual leave".into()),
        };

        let result = service
            .request_leave(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await;

        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(result.leave_request_id, id_gen.uuid);
    }

    #[tokio::test]
    async fn test_request_leave_emits_outbox_event() {
        let idempotency = MockIdempotencyPort::new();
        let employee_repo = MockEmployeeRepository::new();
        let leave_repo = MockLeaveRequestRepository::new();
        let outbox = Arc::new(MockOutboxPort::new());
        let outbox_clone = Arc::clone(&outbox);

        let service = PauseService::new(
            Arc::new(idempotency),
            Arc::new(employee_repo),
            Arc::new(leave_repo),
            outbox_clone,
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = RequestLeaveCommand {
            employee_id: test_employee_id(),
            leave_type: "sick".into(),
            start_date: SystemTime::UNIX_EPOCH,
            end_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86_400),
            reason: None,
        };

        let result = service
            .request_leave(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await
            .unwrap();

        let calls = outbox.calls();
        assert_eq!(calls.len(), 1, "exactly one outbox event should be emitted");

        let call = &calls[0];
        assert_eq!(call.schema, PAUSE_SCHEMA, "schema should be collab_ops");
        assert_eq!(
            call.event_type, "LeaveRequestedV1",
            "event type should be LeaveRequestedV1"
        );
        assert_eq!(call.aggregate_id, result.leave_request_id);

        let payload = &call.payload;
        assert_eq!(
            payload["leave_request_id"],
            result.leave_request_id.to_string()
        );
        assert_eq!(payload["leave_type"], "sick");
    }

    #[tokio::test]
    async fn test_request_leave_idempotency_cached() {
        let cached_result = RequestLeaveResult {
            leave_request_id: Uuid::new_v4(),
        };
        let cached_json = serde_json::to_value(&cached_result).unwrap();

        let idempotency = MockIdempotencyPort::with_cached_response(cached_json);
        let leave_repo = Arc::new(MockLeaveRequestRepository::new());
        let leave_repo_clone = Arc::clone(&leave_repo);
        let outbox = Arc::new(MockOutboxPort::new());
        let outbox_clone = Arc::clone(&outbox);

        let service = PauseService::new(
            Arc::new(idempotency),
            Arc::new(MockEmployeeRepository::new()),
            leave_repo_clone,
            outbox_clone,
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = RequestLeaveCommand {
            employee_id: test_employee_id(),
            leave_type: "vacation".into(),
            start_date: SystemTime::UNIX_EPOCH,
            end_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86_400),
            reason: None,
        };

        let result = service
            .request_leave(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await
            .unwrap();

        assert_eq!(result.leave_request_id, cached_result.leave_request_id);
        assert!(
            leave_repo.calls().is_empty(),
            "leave repo should not be called for cached response"
        );
        assert!(
            outbox.calls().is_empty(),
            "outbox should not be called for cached response"
        );
    }

    #[tokio::test]
    async fn test_request_leave_persistence_error_propagates() {
        let idempotency = Arc::new(MockIdempotencyPort::new());
        let idempotency_clone = Arc::clone(&idempotency);

        let service = PauseService::new(
            idempotency_clone,
            Arc::new(MockEmployeeRepository::new()),
            Arc::new(MockLeaveRequestRepository::with_failure()),
            Arc::new(MockOutboxPort::new()),
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = RequestLeaveCommand {
            employee_id: test_employee_id(),
            leave_type: "vacation".into(),
            start_date: SystemTime::UNIX_EPOCH,
            end_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86_400),
            reason: None,
        };

        let result = service
            .request_leave(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await;

        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            PauseServiceError::Persistence(_)
        ));
        assert_eq!(idempotency.rollback_count(), 1, "rollback should be called");
    }

    #[tokio::test]
    async fn test_request_leave_validation_error_propagates() {
        let idempotency = Arc::new(MockIdempotencyPort::new());
        let idempotency_clone = Arc::clone(&idempotency);

        let service = PauseService::new(
            idempotency_clone,
            Arc::new(MockEmployeeRepository::new()),
            Arc::new(MockLeaveRequestRepository::new()),
            Arc::new(MockOutboxPort::new()),
        );

        let id_gen = test_mock_id_gen();
        let clock = test_mock_clock();
        let tenant_id = test_tenant_id();
        let command = RequestLeaveCommand {
            employee_id: test_employee_id(),
            leave_type: "".into(),
            start_date: SystemTime::UNIX_EPOCH,
            end_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86_400),
            reason: None,
        };

        let result = service
            .request_leave(&tenant_id, command, &id_gen, &clock, test_command_id())
            .await;

        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            PauseServiceError::Validation(_)
        ));
        assert_eq!(
            idempotency.rollback_count(),
            1,
            "rollback should be called on validation error"
        );
    }

    // ---- Idempotency Flow Tests ----

    #[tokio::test]
    async fn test_create_employee_calls_idempotency_acquire() {
        let idempotency = Arc::new(MockIdempotencyPort::new());
        let idempotency_clone = Arc::clone(&idempotency);

        let service = PauseService::new(
            idempotency_clone,
            Arc::new(MockEmployeeRepository::new()),
            Arc::new(MockLeaveRequestRepository::new()),
            Arc::new(MockOutboxPort::new()),
        );

        let command = CreateEmployeeCommand {
            name: "Alice".into(),
            department: "Engineering".into(),
            position: "Senior Engineer".into(),
            hire_date: SystemTime::UNIX_EPOCH,
        };

        service
            .create_employee(
                &test_tenant_id(),
                command,
                &test_mock_id_gen(),
                &test_mock_clock(),
                test_command_id(),
            )
            .await
            .unwrap();

        assert_eq!(
            idempotency.acquire_count(),
            1,
            "acquire should be called exactly once"
        );
        assert_eq!(
            idempotency.commit_count(),
            1,
            "commit should be called on success"
        );
        assert_eq!(
            idempotency.rollback_count(),
            0,
            "rollback should not be called on success"
        );
    }

    #[tokio::test]
    async fn test_request_leave_calls_idempotency_acquire() {
        let idempotency = Arc::new(MockIdempotencyPort::new());
        let idempotency_clone = Arc::clone(&idempotency);

        let service = PauseService::new(
            idempotency_clone,
            Arc::new(MockEmployeeRepository::new()),
            Arc::new(MockLeaveRequestRepository::new()),
            Arc::new(MockOutboxPort::new()),
        );

        let command = RequestLeaveCommand {
            employee_id: test_employee_id(),
            leave_type: "vacation".into(),
            start_date: SystemTime::UNIX_EPOCH,
            end_date: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(86_400),
            reason: None,
        };

        service
            .request_leave(
                &test_tenant_id(),
                command,
                &test_mock_id_gen(),
                &test_mock_clock(),
                test_command_id(),
            )
            .await
            .unwrap();

        assert_eq!(
            idempotency.acquire_count(),
            1,
            "acquire should be called exactly once"
        );
        assert_eq!(
            idempotency.commit_count(),
            1,
            "commit should be called on success"
        );
        assert_eq!(
            idempotency.rollback_count(),
            0,
            "rollback should not be called on success"
        );
    }

    // ---- Guard Handle Tests ----

    #[test]
    fn test_idempotency_guard_handle_cached() {
        let cached = serde_json::json!({"employee_id": "00000000-0000-0000-0000-000000000001"});
        let handle = IdempotencyGuardHandle::new(Some(cached));

        assert!(handle.is_cached());
        let result: CreateEmployeeResult = handle.get_cached().unwrap();
        assert_eq!(
            result.employee_id,
            Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
        );
    }

    #[test]
    fn test_idempotency_guard_handle_not_cached() {
        let handle = IdempotencyGuardHandle::new(None);

        assert!(!handle.is_cached());

        let result = handle.get_cached::<CreateEmployeeResult>();
        assert!(
            result.is_err(),
            "get_cached should fail when no cached response"
        );
    }
}
