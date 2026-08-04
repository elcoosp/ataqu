use crate::errors::SparkError;
use crate::lease::Lease;
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
    async fn list_active_workflows_by_event_type(
        &self,
        schema: &str,
        event_type: &str,
    ) -> Result<Vec<Workflow>, SparkError>;
    async fn list_active_scheduled_workflows(&self) -> Result<Vec<Workflow>, SparkError>;
    async fn get_workflow_lease(
        &self,
        tenant_id: &TenantId,
        workflow_id: &Uuid,
    ) -> Result<Option<Lease>, SparkError>;
    async fn save_lease(&self, lease: &Lease) -> Result<(), SparkError>;
}
