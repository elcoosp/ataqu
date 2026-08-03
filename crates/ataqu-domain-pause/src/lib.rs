//! PAUSE domain: pure HR logic and repository port traits.
pub mod employee;
pub mod leave;
pub mod error;
pub mod repository;

// Re-export common types
pub use employee::{Employee, CreateEmployeeCommand, EmployeeCreatedEvent};
pub use leave::{LeaveRequest, RequestLeaveCommand, LeaveRequestedEvent};
pub use error::PauseDomainError;
