use crate::{Action, Condition, Trigger};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct CreateWorkflowCommand {
    pub tenant_id: Uuid,
    pub name: String,
    pub trigger: Trigger,
    pub conditions: Vec<Condition>,
    pub actions: Vec<Action>,
    pub webhook_secret: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TriggerWorkflowCommand {
    pub tenant_id: Uuid,
    pub workflow_id: Uuid,
    pub payload: serde_json::Value,
}
