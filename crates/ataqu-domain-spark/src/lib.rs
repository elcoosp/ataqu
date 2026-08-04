pub mod action;
pub mod commands;
pub mod condition;
pub mod errors;
pub mod events;
pub mod repository;
pub mod trigger;
pub mod workflow;

// Re-export key types for convenience
pub use action::Action;
pub use commands::{CreateWorkflowCommand, TriggerWorkflowCommand};
pub use condition::Condition;
pub use errors::SparkError;
pub use events::{ActionExecuted, WorkflowCreated, WorkflowTriggered};
pub use trigger::Trigger;
pub use workflow::{Workflow, create_workflow, evaluate_conditions, trigger_workflow};
