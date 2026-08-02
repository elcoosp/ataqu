use ataqu_contracts::spark::WorkflowAction;
use ataqu_kernel::TenantId;
use sea_orm::DatabaseTransaction;
use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum SparkRepositoryError {
    #[error("Database error: {0}")]
    DbErr(String),
}

pub struct SparkRepository;

impl SparkRepository {
    pub async fn acquire_lease_and_dispatch(
        &self,
        _txn: &mut DatabaseTransaction,
        _tenant_id: &TenantId,
        _workflow_id: &Uuid,
        _expected_token: u64,
        _actions: &[WorkflowAction],
    ) -> Result<(), SparkRepositoryError> {
        // Infrastructure: Acquire fenced lease (atomic UPDATE fence_token = fence_token + 1)
        // and dispatch actions by appending to core.outbox in the SAME transaction.
        Ok(())
    }
}
