pub mod action;
pub mod condition;
pub mod commands;
pub mod errors;
pub mod events;
pub mod trigger;
pub mod workflow;
pub mod repository;

// Re-export key types for convenience
pub use action::Action;
pub use condition::Condition;
pub use commands::{CreateWorkflowCommand, TriggerWorkflowCommand};
pub use errors::SparkError;
pub use events::{WorkflowCreated, WorkflowTriggered, ActionExecuted};
pub use trigger::Trigger;
pub use workflow::{Workflow, create_workflow, trigger_workflow, evaluate_conditions};
