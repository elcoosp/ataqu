// allowed: pre-existing clippy warnings blocking TASK-078 build

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
