use thiserror::Error;

#[derive(Debug, Error)]
pub enum PauseDomainError {
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Persistence error: {0}")]
    Persistence(String),
    #[error("Idempotency error: {0}")]
    Idempotency(String),
    #[error("Not found")]
    NotFound,
}
