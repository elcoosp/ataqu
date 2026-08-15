use crate::errors::SparkError;
use crate::lease::Lease;
use crate::workflow::Workflow;
pub use crate::workflow::{WorkflowRun, WorkflowRunStatus};
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
    async fn update_workflow(&self, workflow: &Workflow) -> Result<(), SparkError>;
    async fn delete_workflow(
        &self,
        tenant_id: &TenantId,
        workflow_id: &Uuid,
    ) -> Result<(), SparkError>;
    async fn list_workflows(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Workflow>, SparkError>;

    async fn count_workflows(&self, tenant_id: &TenantId) -> Result<u64, SparkError>;
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

#[async_trait]
pub trait WorkflowRunRepository: Send + Sync {
    async fn create_run(&self, run: &WorkflowRun) -> Result<(), SparkError>;

    async fn update_run_status(
        &self,
        tenant_id: &TenantId,
        run_id: &Uuid,
        status: &WorkflowRunStatus,
    ) -> Result<(), SparkError>;

    async fn get_run(
        &self,
        tenant_id: &TenantId,
        run_id: &Uuid,
    ) -> Result<Option<WorkflowRun>, SparkError>;

    async fn list_runs(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<WorkflowRun>, SparkError>;
}
