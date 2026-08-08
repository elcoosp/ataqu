// allowed: pre-existing clippy warnings blocking TASK-078 build
#![allow(clippy::collapsible_if)]
#![allow(clippy::new_without_default)]
#![allow(clippy::needless_return)]
#![allow(clippy::question_mark)]
#![allow(clippy::too_many_arguments)]
#![allow(clippy::useless_conversion)]
#![allow(clippy::redundant_closure)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::map_clone)]
#![allow(clippy::explicit_counter_loop)]
#![allow(clippy::unwrap_or_default)]

pub mod action;
pub mod commands;
pub mod condition;
pub mod errors;
pub mod events;
pub mod lease;
pub mod repository;
pub mod trigger;
pub mod workflow;

pub use action::Action;
pub use commands::{CreateWorkflowCommand, TriggerWorkflowCommand};
pub use condition::{Condition, evaluate_conditions};
pub use errors::SparkError;
pub use events::{ActionExecuted, WorkflowCreated, WorkflowTriggered};
pub use lease::Lease;
pub use trigger::Trigger;
pub use workflow::{Workflow, create_workflow, trigger_workflow};
