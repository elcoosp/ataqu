use crate::action::Action;
use crate::condition::Condition;
use crate::trigger::Trigger;
use crate::{
    commands::{CreateWorkflowCommand, TriggerWorkflowCommand},
    errors::SparkError,
    events::{WorkflowCreated, WorkflowTriggered},
};
use ataqu_kernel::{Clock, IdGenerator};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct Workflow {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub trigger: Trigger,
    pub conditions: Vec<Condition>,
    pub actions: Vec<Action>,
    pub is_active: bool,
    pub webhook_secret: Option<String>,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
    pub version: i32,
}

pub fn create_workflow(
    cmd: CreateWorkflowCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<(Workflow, WorkflowCreated), SparkError> {
    if cmd.name.trim().is_empty() {
        return Err(SparkError::InvalidWorkflowName);
    }

    let id = id_gen.new_uuid_v7();
    let created_at = clock.now();

    let workflow = Workflow {
        id,
        tenant_id: cmd.tenant_id,
        name: cmd.name.clone(),
        trigger: cmd.trigger,
        conditions: cmd.conditions,
        actions: cmd.actions,
        is_active: true,
        webhook_secret: None,
        created_at,
        updated_at: created_at,
        version: 0,
    };

    let event = WorkflowCreated {
        id,
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        created_at,
    };

    Ok((workflow, event))
}

pub fn trigger_workflow(
    cmd: &TriggerWorkflowCommand,
    workflow: &Workflow,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<WorkflowTriggered, SparkError> {
    if !workflow.is_active {
        return Err(SparkError::WorkflowInactive);
    }
    if workflow.tenant_id != cmd.tenant_id {
        return Err(SparkError::TenantMismatch);
    }

    let execution_id = id_gen.new_uuid_v7();
    let triggered_at = clock.now();

    Ok(WorkflowTriggered {
        workflow_id: workflow.id,
        execution_id,
        triggered_at,
    })
}

/// The execution status of a single workflow run.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowRunStatus {
    Running,
    PendingApproval,
    Approved,
    Rejected,
    Completed,
    Failed,
}

/// A single execution instance of a workflow.
#[derive(Debug, Clone, PartialEq)]
pub struct WorkflowRun {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_id: Uuid,
    pub status: WorkflowRunStatus,
    pub payload: serde_json::Value,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

#[cfg(test)]
mod workflow_run_tests {
    use super::*;

    #[test]
    fn run_status_serializes_to_snake_case() {
        let serialized = serde_json::to_string(&WorkflowRunStatus::PendingApproval)
            .expect("status must serialize");
        assert_eq!(serialized, "\"pending_approval\"");

        let serialized =
            serde_json::to_string(&WorkflowRunStatus::Running).expect("status must serialize");
        assert_eq!(serialized, "\"running\"");
    }
}
