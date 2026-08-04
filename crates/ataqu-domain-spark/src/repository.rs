use crate::action::Action;
use crate::errors::SparkError;
use crate::workflow::Workflow;
use async_trait::async_trait;
use ataqu_kernel::TenantId;
use uuid::Uuid;

#[async_trait]
pub trait SparkRepository: Send + Sync {
    async fn get_workflow(
        &self,
        tenant_id: &TenantId,
        workflow_id: &Uuid,
    ) -> Result<Option<Workflow>, SparkError>;
    async fn save_workflow(&self, workflow: &Workflow) -> Result<(), SparkError>;
    async fn list_workflows(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Workflow>, SparkError>;
    async fn acquire_lease_and_dispatch(
        &self,
        tenant_id: &TenantId,
        workflow_id: &Uuid,
        expected_token: u64,
        actions: &[Action],
    ) -> Result<(), SparkError>;
}
