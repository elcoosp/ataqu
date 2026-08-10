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
    pub fn internal(msg: &str) -> Self {
        Self::Internal(msg.to_string())
    }
    pub fn is_validation(&self) -> bool {
        matches!(self, Self::Validation(_) | Self::Conflict(_))
    }
}

impl IntoResponse for ApiResponseError {
    fn into_response(self) -> Response {
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
            "request_id": None::<String>,
        });
        let mut response = (status, axum::Json(body)).into_response();
        if matches!(self, Self::ServiceUnavailable(_)) {
            response.headers_mut().insert(
                "retry-after",
                axum::http::HeaderValue::from_static("5"),
            );
        }
        response
    }
}

pub type ApiResult<T> = Result<T, ApiResponseError>;
