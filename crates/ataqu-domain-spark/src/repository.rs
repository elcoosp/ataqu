use crate::{SparkError, Workflow};
use async_trait::async_trait;
use uuid::Uuid;

#[async_trait]
pub trait SparkRepository: Send + Sync {
    async fn get_workflow(
        &self,
        tenant_id: &Uuid,
        workflow_id: &Uuid,
    ) -> Result<Option<Workflow>, SparkError>;
    async fn save_workflow(&self, workflow: &Workflow) -> Result<(), SparkError>;
}
