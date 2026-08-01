//! Error types for the Ataqu platform.
//!
//! Two error categories are defined here:
//!
//! - [`DomainError`]: Pure business-rule violations raised inside domain
//!   crates. These never carry I/O or infrastructure details.
//! - [`RepositoryError`]: Infrastructure-level persistence failures mapped
//!   from database errors. The generic `transactional_batch_insert` helper
//!   (ADR-014) and individual repository implementations convert database
//!   driver errors into these variants.

use thiserror::Error;

// ---------------------------------------------------------------------------
// DomainError
// ---------------------------------------------------------------------------

/// Errors that occur during domain logic execution.
///
/// These represent pure business-rule violations — no I/O, SQL, or
/// infrastructure concerns leak into domain errors. Domain functions
/// return `Result<T, DomainError>`.
///
/// # HTTP Mapping (application layer)
///
/// | Variant              | HTTP Status |
/// |----------------------|-------------|
/// | `Validation`         | 422         |
/// | `NotFound`           | 404         |
/// | `Conflict`           | 409         |
/// | `BusinessRule`       | 422         |
/// | `TenantViolation`    | 403         |
/// | `Unauthorized`       | 401         |
/// | `Forbidden`          | 403         |
#[derive(Debug, Error)]
pub enum DomainError {
    /// Input failed domain-level validation.
    #[error("validation failed: {0}")]
    Validation(String),

    /// A required entity or aggregate was not found.
    #[error("entity not found: {0}")]
    NotFound(String),

    /// The operation conflicts with the current aggregate state
    /// (e.g., duplicate name, OCC version mismatch).
    #[error("state conflict: {0}")]
    Conflict(String),

    /// A business rule invariant was violated
    /// (e.g., stock cannot go negative — ADR-023).
    #[error("business rule violation: {0}")]
    BusinessRule(String),

    /// An operation attempted to access or modify data belonging to
    /// a different tenant.
    #[error("tenant isolation violation")]
    TenantViolation,

    /// Authentication is required or the provided credentials are invalid.
    #[error("unauthorized")]
    Unauthorized,

    /// The authenticated principal lacks permission for the operation.
    #[error("forbidden")]
    Forbidden,
}

// ---------------------------------------------------------------------------
// RepositoryError
// ---------------------------------------------------------------------------

/// Errors that occur during repository (persistence) operations.
///
/// These represent infrastructure-level failures when interacting with
/// PostgreSQL. The variants correspond to common database constraint
/// violations and connection issues.
///
/// # Mapping from Database Driver Errors
///
/// The kernel intentionally does **not** depend on `sqlx` or `sea-orm`.
/// Infrastructure code maps driver errors using
/// [`RepositoryError::from_constraint_flags`]:
///
/// ```ignore
/// // In ataqu-infra-repositories:
/// let repo_err = RepositoryError::from_constraint_flags(
///     db_err.is_unique_violation(),
///     db_err.is_foreign_key_violation(),
///     db_err.is_check_violation(),
/// );
/// ```
#[derive(Debug, Error)]
pub enum RepositoryError {
    /// A `UNIQUE` constraint was violated.
    #[error("unique constraint violation")]
    UniqueViolation,

    /// A `FOREIGN KEY` constraint was violated.
    #[error("foreign key constraint violation")]
    ForeignKeyViolation,

    /// A `CHECK` constraint was violated
    /// (e.g., `stock_quantity >= 0` — ADR-023).
    #[error("check constraint violation")]
    CheckViolation,

    /// The requested entity was not found in the database.
    #[error("entity not found")]
    NotFound,

    /// A generic database error occurred (e.g., syntax error, type mismatch).
    #[error("database error: {0}")]
    Database(String),

    /// A connection or pool error occurred (e.g., timeout, pool exhausted).
    #[error("connection error: {0}")]
    Connection(String),

    /// An uncategorised error occurred. Used as a fallback when the
    /// specific error type cannot be determined.
    #[error("unknown repository error")]
    Unknown,
}

impl RepositoryError {
    /// Classifies database constraint violation flags into a `RepositoryError`.
    ///
    /// This method allows infrastructure layers to map database driver
    /// errors to kernel error types without the kernel depending on the
    /// database driver crate. Priority: unique > foreign key > check > unknown.
    ///
    /// # Examples
    ///
    /// ```
    /// use ataqu_kernel::RepositoryError;
    ///
    /// let err = RepositoryError::from_constraint_flags(true, false, false);
    /// assert!(matches!(err, RepositoryError::UniqueViolation));
    /// ```
    #[inline]
    pub fn from_constraint_flags(
        is_unique_violation: bool,
        is_foreign_key_violation: bool,
        is_check_violation: bool,
    ) -> Self {
        if is_unique_violation {
            Self::UniqueViolation
        } else if is_foreign_key_violation {
            Self::ForeignKeyViolation
        } else if is_check_violation {
            Self::CheckViolation
        } else {
            Self::Unknown
        }
    }

    /// Returns `true` if this error represents a data-level violation
    /// (unique, foreign key, or check constraint).
    ///
    /// Used by the generic `transactional_batch_insert` helper (ADR-014)
    /// to decide whether to fall back to 1-by-1 insertion or abort
    /// immediately on transient errors.
    ///
    /// # Examples
    ///
    /// ```
    /// use ataqu_kernel::RepositoryError;
    ///
    /// assert!(RepositoryError::UniqueViolation.is_data_violation());
    /// assert!(RepositoryError::ForeignKeyViolation.is_data_violation());
    /// assert!(RepositoryError::CheckViolation.is_data_violation());
    /// assert!(!RepositoryError::Unknown.is_data_violation());
    /// ```
    #[inline]
    pub fn is_data_violation(&self) -> bool {
        matches!(
            self,
            Self::UniqueViolation | Self::ForeignKeyViolation | Self::CheckViolation
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // DomainError tests
    // -----------------------------------------------------------------------

    #[test]
    fn domain_error_validation_display() {
        let err = DomainError::Validation("email is required".into());
        assert_eq!(err.to_string(), "validation failed: email is required");
    }

    #[test]
    fn domain_error_not_found_display() {
        let err = DomainError::NotFound("contact 123".into());
        assert_eq!(err.to_string(), "entity not found: contact 123");
    }

    #[test]
    fn domain_error_conflict_display() {
        let err = DomainError::Conflict("version mismatch".into());
        assert_eq!(err.to_string(), "state conflict: version mismatch");
    }

    #[test]
    fn domain_error_business_rule_display() {
        let err = DomainError::BusinessRule("stock cannot be negative".into());
        assert_eq!(
            err.to_string(),
            "business rule violation: stock cannot be negative"
        );
    }

    #[test]
    fn domain_error_tenant_violation_display() {
        let err = DomainError::TenantViolation;
        assert_eq!(err.to_string(), "tenant isolation violation");
    }

    #[test]
    fn domain_error_unauthorized_display() {
        let err = DomainError::Unauthorized;
        assert_eq!(err.to_string(), "unauthorized");
    }

    #[test]
    fn domain_error_forbidden_display() {
        let err = DomainError::Forbidden;
        assert_eq!(err.to_string(), "forbidden");
    }

    #[test]
    fn domain_error_is_send_sync() {
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<DomainError>();
    }

    #[test]
    fn domain_error_empty_validation_message() {
        let err = DomainError::Validation(String::new());
        assert_eq!(err.to_string(), "validation failed: ");
    }

    // -----------------------------------------------------------------------
    // RepositoryError tests
    // -----------------------------------------------------------------------

    #[test]
    fn repository_error_unique_violation_display() {
        assert_eq!(
            RepositoryError::UniqueViolation.to_string(),
            "unique constraint violation"
        );
    }

    #[test]
    fn repository_error_foreign_key_violation_display() {
        assert_eq!(
            RepositoryError::ForeignKeyViolation.to_string(),
            "foreign key constraint violation"
        );
    }

    #[test]
    fn repository_error_check_violation_display() {
        assert_eq!(
            RepositoryError::CheckViolation.to_string(),
            "check constraint violation"
        );
    }

    #[test]
    fn repository_error_not_found_display() {
        assert_eq!(RepositoryError::NotFound.to_string(), "entity not found");
    }

    #[test]
    fn repository_error_database_display() {
        let err = RepositoryError::Database("syntax error at position 42".into());
        assert_eq!(
            err.to_string(),
            "database error: syntax error at position 42"
        );
    }

    #[test]
    fn repository_error_connection_display() {
        let err = RepositoryError::Connection("pool exhausted".into());
        assert_eq!(err.to_string(), "connection error: pool exhausted");
    }

    #[test]
    fn repository_error_unknown_display() {
        assert_eq!(
            RepositoryError::Unknown.to_string(),
            "unknown repository error"
        );
    }

    #[test]
    fn repository_error_is_send_sync() {
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<RepositoryError>();
    }

    // -----------------------------------------------------------------------
    // from_constraint_flags tests
    // -----------------------------------------------------------------------

    #[test]
    fn from_constraint_flags_unique() {
        let err = RepositoryError::from_constraint_flags(true, false, false);
        assert!(matches!(err, RepositoryError::UniqueViolation));
    }

    #[test]
    fn from_constraint_flags_foreign_key() {
        let err = RepositoryError::from_constraint_flags(false, true, false);
        assert!(matches!(err, RepositoryError::ForeignKeyViolation));
    }

    #[test]
    fn from_constraint_flags_check() {
        let err = RepositoryError::from_constraint_flags(false, false, true);
        assert!(matches!(err, RepositoryError::CheckViolation));
    }

    #[test]
    fn from_constraint_flags_unknown_when_none() {
        let err = RepositoryError::from_constraint_flags(false, false, false);
        assert!(matches!(err, RepositoryError::Unknown));
    }

    #[test]
    fn from_constraint_flags_unique_takes_priority() {
        let err = RepositoryError::from_constraint_flags(true, true, true);
        assert!(matches!(err, RepositoryError::UniqueViolation));
    }

    #[test]
    fn from_constraint_flags_foreign_key_over_check() {
        let err = RepositoryError::from_constraint_flags(false, true, true);
        assert!(matches!(err, RepositoryError::ForeignKeyViolation));
    }

    // -----------------------------------------------------------------------
    // is_data_violation tests
    // -----------------------------------------------------------------------

    #[test]
    fn is_data_violation_true_for_unique() {
        assert!(RepositoryError::UniqueViolation.is_data_violation());
    }

    #[test]
    fn is_data_violation_true_for_foreign_key() {
        assert!(RepositoryError::ForeignKeyViolation.is_data_violation());
    }

    #[test]
    fn is_data_violation_true_for_check() {
        assert!(RepositoryError::CheckViolation.is_data_violation());
    }

    #[test]
    fn is_data_violation_false_for_not_found() {
        assert!(!RepositoryError::NotFound.is_data_violation());
    }

    #[test]
    fn is_data_violation_false_for_database() {
        assert!(!RepositoryError::Database("err".into()).is_data_violation());
    }

    #[test]
    fn is_data_violation_false_for_connection() {
        assert!(!RepositoryError::Connection("err".into()).is_data_violation());
    }

    #[test]
    fn is_data_violation_false_for_unknown() {
        assert!(!RepositoryError::Unknown.is_data_violation());
    }
}
