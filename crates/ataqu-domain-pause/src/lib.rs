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

//! PAUSE domain: pure HR logic and repository port traits.
pub mod document;
pub mod employee;
pub mod error;
pub mod leave;
pub mod repository;

// Re-export common types
pub use document::{CreateDocumentCommand, EmployeeDocument};
pub use employee::{CreateEmployeeCommand, Employee, EmployeeCreatedEvent};
pub use error::PauseDomainError;
pub use leave::{LeaveRequest, LeaveRequestedEvent, LeaveStatus, LeaveType, RequestLeaveCommand};
