use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A workflow action that can be executed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowAction {
    pub id: Uuid,
    pub action_type: String,
    pub parameters: serde_json::Value,
}

/// Command to execute a workflow.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteWorkflowCommand {
    pub workflow_id: Uuid,
    pub tenant_id: Uuid,
    pub trigger_payload: serde_json::Value,
}

/// Event emitted when a workflow is executed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowExecutedEvent {
    pub workflow_id: Uuid,
    pub fence_token: u64,
    pub actions: Vec<WorkflowAction>,
}
