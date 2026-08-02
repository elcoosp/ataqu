use ataqu_contracts::spark::{ExecuteWorkflowCommand, WorkflowExecutedEvent};
use ataqu_domain_spark::SparkDomain;
use ataqu_infra_idempotency::IdempotencyGuard;
use ataqu_infra_repositories::SparkRepository;
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SparkServiceError {
    #[error("Idempotency guard error: {0}")]
    Idempotency(String),
    #[error("Domain error: {0}")]
    Domain(String),
    #[error("Infrastructure error: {0}")]
    Infra(String),
}

pub struct SparkService {
    domain: SparkDomain,
    repo: SparkRepository,
}

impl SparkService {
    pub fn new(domain: SparkDomain, repo: SparkRepository) -> Self {
        Self { domain, repo }
    }

    /// Executes a workflow command, following strict idempotency flow (ADR-017).
    ///
    /// 1. Validates and processes the command via pure domain logic.
    /// 2. Acquires a fenced lease and dispatches actions to the outbox within the same transaction.
    ///
    /// The caller is responsible for acquiring the `IdempotencyGuard` before calling this method,
    /// ensuring the advisory lock is held and the transaction is properly committed or rolled back.
    pub async fn execute_workflow(
        &self,
        tenant_id: &TenantId,
        cmd: ExecuteWorkflowCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        mut guard: IdempotencyGuard,
    ) -> Result<WorkflowExecutedEvent, SparkServiceError> {
        // Extract the mutable transaction reference from the guard
        let txn = guard.transaction_mut();

        // 1. Domain pure function: Command + IdGenerator + Clock → Event
        // NO I/O, NO transactions, NO SQL, NO savepoints, NO system clock/RNG reads.
        let event = self
            .domain
            .execute_workflow(cmd, id_gen, clock)
            .map_err(|e| SparkServiceError::Domain(e.to_string()))?;

        // 2. Infrastructure: Acquire fenced lease (atomic UPDATE fence_token = fence_token + 1)
        // and dispatch actions by appending to core.outbox in the SAME transaction.
        self.repo
            .acquire_lease_and_dispatch(
                txn,
                tenant_id,
                &event.workflow_id,
                event.fence_token,
                &event.actions,
            )
            .await
            .map_err(|e| SparkServiceError::Infra(e.to_string()))?;

        // 3. Mark the idempotency guard as completed. This updates the idempotency record
        // and ensures the transaction commits, releasing the advisory lock.
        guard
            .complete()
            .await
            .map_err(|e| SparkServiceError::Idempotency(e.to_string()))?;

        Ok(event)
    }
}
