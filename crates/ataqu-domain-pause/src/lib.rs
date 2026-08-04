//! PAUSE domain: pure HR logic and repository port traits.
pub mod document;
pub mod employee;
pub mod error;
pub mod leave;
pub mod repository;

// Re-export common types
pub use employee::{CreateEmployeeCommand, Employee, EmployeeCreatedEvent};
pub use error::PauseDomainError;
pub use leave::{LeaveRequest, LeaveRequestedEvent, LeaveStatus, LeaveType, RequestLeaveCommand};
pub use document::{EmployeeDocument, CreateDocumentCommand};
