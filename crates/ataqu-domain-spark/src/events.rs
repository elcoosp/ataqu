use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct WorkflowCreated {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub created_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub struct WorkflowTriggered {
    pub workflow_id: Uuid,
    pub execution_id: Uuid,
    pub triggered_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ActionExecuted {
    pub execution_id: Uuid,
    pub action_index: usize,
    pub executed_at: SystemTime,
}
