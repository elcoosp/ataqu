use thiserror::Error;
use uuid::Uuid;
use ataqu_kernel::{Clock, IdGenerator};
use ataqu_kernel::TenantId;

#[derive(Error, Debug)]
pub enum SparkError {
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
    #[error("Workflow not found")]
    NotFound,
}

#[derive(Debug, Clone)]
pub struct WorkflowResult {
    pub id: Uuid,
    pub status: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub steps: Vec<String>,
}

#[derive(Clone)]
pub struct SparkService;

impl SparkService {
    pub async fn create_workflow(
        &self,
        _idempotency_key: String,
        _req: CreateWorkflowRequest,
    ) -> Result<WorkflowResult, SparkError> {
        Ok(WorkflowResult {
            id: Uuid::new_v4(),
            status: "created".to_string(),
        })
    }

    pub async fn execute_workflow(
        &self,
        _idempotency_key: String,
        workflow_id: Uuid,
    ) -> Result<WorkflowResult, SparkError> {
        Ok(WorkflowResult {
            id: workflow_id,
            status: "executing".to_string(),
        })
    }
}