use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ApiResponseError {
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
    #[error("Forbidden: {0}")]
    Forbidden(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("Rate limited")]
    RateLimited,
    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),
    #[error("Internal error: {0}")]
    Internal(String),
}

impl ApiResponseError {
    pub fn unauthorized(msg: &str) -> Self {
        Self::Unauthorized(msg.to_string())
    }
    pub fn not_found(msg: &str) -> Self {
        Self::NotFound(msg.to_string())
    }
    pub fn conflict(msg: &str) -> Self {
        Self::Conflict(msg.to_string())
    }
    pub fn validation(msg: &str) -> Self {
        Self::Validation(msg.to_string())
    }
    /// Build an internal error from a static message (no underlying cause).
    pub fn internal(msg: &str) -> Self {
        Self::Internal(msg.to_string())
    }
    /// Build an internal error, preserving the underlying error's message so
    /// the cause is never swallowed. The `IntoResponse` impl logs it.
    pub fn internal_err<E: std::error::Error + Send + Sync + 'static>(e: E) -> Self {
        Self::Internal(e.to_string())
    }
    pub fn is_validation(&self) -> bool {
        matches!(self, Self::Validation(_) | Self::Conflict(_))
    }
}

/// Ergonomic `?` conversions for the most common error types surfaced by
/// handlers. Each preserves the underlying cause (logged at the response
/// boundary), so `?` on a sqlx/serde_json error is no longer lost.
impl From<sqlx::Error> for ApiResponseError {
    fn from(e: sqlx::Error) -> Self {
        Self::Internal(e.to_string())
    }
}
impl From<serde_json::Error> for ApiResponseError {
    fn from(e: serde_json::Error) -> Self {
        Self::Internal(e.to_string())
    }
}
impl From<std::io::Error> for ApiResponseError {
    fn from(e: std::io::Error) -> Self {
        Self::Internal(e.to_string())
    }
}
impl From<std::env::VarError> for ApiResponseError {
    fn from(e: std::env::VarError) -> Self {
        Self::Internal(e.to_string())
    }
}
impl From<base64::DecodeError> for ApiResponseError {
    fn from(e: base64::DecodeError) -> Self {
        Self::Internal(e.to_string())
    }
}

impl IntoResponse for ApiResponseError {
    fn into_response(self) -> Response {
        // Log server-side errors with their cause before returning them. The
        // message carries the underlying error text (see internal_err), so a
        // 500 in production is never silent.
        match &self {
            Self::Internal(msg) => {
                tracing::error!(error = %msg, "returning 500 INTERNAL_ERROR");
            }
            Self::ServiceUnavailable(msg) => {
                tracing::warn!(error = %msg, "returning 503 SERVICE_UNAVAILABLE");
            }
            _ => {}
        }

        let (status, code, message) = match &self {
            Self::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                msg.as_str(),
            ),
            Self::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", msg.as_str()),
            Self::Forbidden(msg) => (StatusCode::FORBIDDEN, "FORBIDDEN", msg.as_str()),
            Self::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg.as_str()),
            Self::Conflict(msg) => (StatusCode::CONFLICT, "CONFLICT", msg.as_str()),
            Self::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMITED",
                "Rate limit exceeded",
            ),
            Self::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                msg.as_str(),
            ),
            Self::ServiceUnavailable(msg) => (
                StatusCode::SERVICE_UNAVAILABLE,
                "SERVICE_UNAVAILABLE",
                msg.as_str(),
            ),
        };
        let body = serde_json::json!({
            "error": {
                "code": code,
                "message": message,
                "details": null,
            },
        });
        let mut response = (status, axum::Json(body)).into_response();
        if matches!(self, Self::ServiceUnavailable(_)) {
            response
                .headers_mut()
                .insert("retry-after", axum::http::HeaderValue::from_static("5"));
        }
        response
    }
}

pub type ApiResult<T> = Result<T, ApiResponseError>;
