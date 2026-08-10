use thiserror::Error;

#[derive(Debug, Error)]
pub enum ShopifyError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Rate limit exceeded, retry after {0} seconds")]
    RateLimited(u64),
    #[error("API error: {0}")]
    Api(String),
    #[error("Deserialization error: {0}")]
    Deserialization(#[from] serde_json::Error),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Authentication failed: {0}")]
    Auth(String),
    #[error("Timeout")]
    Timeout,
    #[error("Other error: {0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, ShopifyError>;
