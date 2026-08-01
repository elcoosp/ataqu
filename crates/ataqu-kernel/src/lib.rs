//! Ataqu Kernel — Core types, traits, and error definitions.
//!
//! This crate provides the foundational abstractions shared across all
//! Ataqu crates:
//!
//! - [`TenantId`]: Tenant identifier newtype with private inner field (ADR-024).
//! - [`Identifiable`]: Entity identity trait (ADR-014).
//! - [`IdGenerator`]: UUID generation capability (ADR-013).
//! - [`Clock`]: System clock capability (ADR-013).
//! - [`DomainError`]: Pure business-rule violations.
//! - [`RepositoryError`]: Infrastructure persistence errors.

pub mod errors;
pub mod traits;
pub mod types;

pub use errors::{DomainError, RepositoryError};
pub use traits::{Clock, IdGenerator, Identifiable};
pub use types::TenantId;
