pub mod spark {
    use serde::{Deserialize, Serialize};
    use uuid::Uuid;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct ExecuteWorkflowCommand {
        pub workflow_id: Uuid,
        pub action: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct WorkflowAction {
        pub action_type: String,
        pub payload: serde_json::Value,
    }

    #[derive(Debug, Clone)]
    pub struct WorkflowExecutedEvent {
        pub workflow_id: Uuid,
        pub fence_token: u64,
        pub actions: Vec<WorkflowAction>,
    }
}
