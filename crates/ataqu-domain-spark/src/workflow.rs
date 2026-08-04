use crate::{
    action::Action,
    commands::{CreateWorkflowCommand, TriggerWorkflowCommand},
    condition::Condition,
    errors::SparkError,
    events::{WorkflowCreated, WorkflowTriggered},
    trigger::Trigger,
};
use ataqu_kernel::{Clock, IdGenerator};
use serde_json::Value;
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
    pub created_at: std::time::SystemTime,
    pub updated_at: std::time::SystemTime,
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
        created_at,
        updated_at: created_at,
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

pub fn evaluate_conditions(conditions: &[Condition], payload: &Value) -> bool {
    for cond in conditions {
        match cond {
            Condition::FieldEquals { field, value } => {
                if let Some(v) = payload.get(field) {
                    if v.as_str() != Some(value) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
            Condition::FieldContains { field, value } => {
                if let Some(v) = payload.get(field) {
                    if let Some(s) = v.as_str() {
                        if !s.contains(value) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
    }
    true
}
