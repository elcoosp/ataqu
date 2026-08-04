use thiserror::Error;

#[derive(Debug, Error)]
pub enum SparkError {
    #[error("Workflow name cannot be empty")]
    InvalidWorkflowName,
    #[error("Workflow is inactive")]
    WorkflowInactive,
    #[error("Tenant mismatch")]
    TenantMismatch,
    #[error("Workflow not found")]
    WorkflowNotFound,
    #[error("Database error: {0}")]
    Database(String),
}
