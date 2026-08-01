use thiserror::Error;

#[derive(Error, Debug)]
pub enum DispatcherError {
    #[error("sqlx error: {0}")]
    Sqlx(#[from] sqlx::Error),

    #[error("handler error: {0}")]
    Handler(String),

    #[error("listener error: {0}")]
    Listener(String),

    #[error("polling error: {0}")]
    Polling(String),

    #[error("event processing failed after max attempts")]
    MaxAttemptsExceeded,
}
pub type Result<T> = std::result::Result<T, DispatcherError>;
