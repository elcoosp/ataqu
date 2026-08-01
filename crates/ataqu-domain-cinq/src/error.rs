use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Error)]
pub enum CinqDomainError {
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Invalid email format")]
    InvalidEmail,
    #[error("Invalid phone format")]
    InvalidPhone,
    #[error("Missing required field: {0}")]
    MissingField(String),
    #[error("Deal amount must be positive")]
    InvalidAmount,
    #[error("Pipeline stage order must be non-negative")]
    InvalidOrder,
}

pub type CinqResult<T> = Result<T, CinqDomainError>;
