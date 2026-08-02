use ataqu_contracts::spark::{ExecuteWorkflowCommand, WorkflowExecutedEvent};
use ataqu_kernel::{Clock, IdGenerator};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SparkDomainError {
    #[error("Invalid command")]
    InvalidCommand,
}

pub struct SparkDomain;

impl SparkDomain {
    pub fn execute_workflow(
        &self,
        cmd: ExecuteWorkflowCommand,
        _id_gen: &impl IdGenerator,
        _clock: &impl Clock,
    ) -> Result<WorkflowExecutedEvent, SparkDomainError> {
        // Pure domain logic: Command + IdGenerator + Clock → Event
        Ok(WorkflowExecutedEvent {
            workflow_id: cmd.workflow_id,
            fence_token: 1,
            actions: vec![],
        })
    }
}
