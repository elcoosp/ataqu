//! AEGIS API handlers.
//! All handlers extract Idempotency-Key and use ApiEmail wrapper for PII.

use axum::{
    Json as AxumJson,
    extract::State,
    http::{HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Json, Response},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

use ataqu_application::aegis_service::{
    AegisDomain, AegisService, AegisServiceError, AuthenticateCommand, OutboxAppender,
    SetupMfaCommand, UserRepository,
};
use ataqu_security::{Email, PiiAccessKey};

use crate::AppState;

// API-layer wrapper for PII serialization (ADR-007)
#[derive(Debug)]
pub struct ApiEmail<'a>(pub &'a Email);
impl<'a> Serialize for ApiEmail<'a> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let key = PiiAccessKey::new_for_test();
        serializer.serialize_str(self.0.reveal(&key))
    }
}

// Custom extractor for Idempotency-Key header.
pub struct IdempotencyKeyHeader(pub Option<Uuid>);

#[allow(clippy::collapsible_if)]
impl<S> axum::extract::FromRequestParts<S> for IdempotencyKeyHeader
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let header_name = HeaderName::from_static("idempotency-key");
        if let Some(value) = parts.headers.get(&header_name) {
            if let Ok(s) = value.to_str() {
                if let Ok(uuid) = Uuid::parse_str(s) {
                    return Ok(IdempotencyKeyHeader(Some(uuid)));
                }
            }
            return Err((StatusCode::BAD_REQUEST, "Invalid Idempotency-Key format"));
        }
        Ok(IdempotencyKeyHeader(None))
    }
}

// Shared state - generic over the service's generic parameters.
#[derive(Clone)]
pub struct AegisHandlerState<R, O, D> {
    pub service: Arc<AegisService<R, O, D>>,
}

// ---------- Login (authenticate) ----------
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub tenant_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct LoginResponseBody {
    pub access_token: String,
    pub refresh_token: String,
}

pub async fn login<R, O, D>(
    State(state): State<AegisHandlerState<R, O, D>>,
    IdempotencyKeyHeader(idempotency_key): IdempotencyKeyHeader,
    AxumJson(req): AxumJson<LoginRequest>,
) -> Response
where
    R: UserRepository + Clone + Send + Sync + 'static,
    O: OutboxAppender + Clone + Send + Sync + 'static,
    D: AegisDomain + Clone + Send + Sync + 'static,
{
    info!(
        tenant_id = ?req.tenant_id,
        idempotency_key = ?idempotency_key,
        "Login attempt"
    );

    let cmd = AuthenticateCommand {
        email: req.email,
        password: req.password,
    };

    match state.service.authenticate(cmd).await {
        Ok(resp) => {
            let body = LoginResponseBody {
                access_token: resp.access_token,
                refresh_token: resp.refresh_token,
            };
            (StatusCode::OK, Json(body)).into_response()
        }
        Err(err) => {
            error!(error = ?err, "Login failed");
            map_aegis_error(err)
        }
    }
}

// ---------- SSO Callback (not implemented) ----------
#[derive(Debug, Deserialize)]
pub struct SsoCallbackRequest {
    pub code: String,
    pub state: String,
    pub provider: String,
}

pub async fn sso_callback<R, O, D>(
    State(_state): State<AegisHandlerState<R, O, D>>,
    IdempotencyKeyHeader(_idempotency_key): IdempotencyKeyHeader,
    AxumJson(_req): AxumJson<SsoCallbackRequest>,
) -> Response
where
    R: UserRepository + Clone + Send + Sync + 'static,
    O: OutboxAppender + Clone + Send + Sync + 'static,
    D: AegisDomain + Clone + Send + Sync + 'static,
{
    warn!("SSO callback not implemented");
    (StatusCode::NOT_IMPLEMENTED, "SSO callback not implemented").into_response()
}

// ---------- MFA Setup ----------
#[derive(Debug, Deserialize)]
pub struct MfaSetupRequest {
    pub user_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct MfaSetupResponseBody {
    pub secret: String,
    pub qr_code_url: String,
}

pub async fn mfa_setup<R, O, D>(
    State(state): State<AegisHandlerState<R, O, D>>,
    IdempotencyKeyHeader(idempotency_key): IdempotencyKeyHeader,
    AxumJson(req): AxumJson<MfaSetupRequest>,
) -> Response
where
    R: UserRepository + Clone + Send + Sync + 'static,
    O: OutboxAppender + Clone + Send + Sync + 'static,
    D: AegisDomain + Clone + Send + Sync + 'static,
{
    info!(
        user_id = ?req.user_id,
        idempotency_key = ?idempotency_key,
        "MFA setup request"
    );

    let cmd = SetupMfaCommand {
        user_id: req.user_id,
    };

    match state.service.setup_mfa(cmd).await {
        Ok(resp) => {
            let body = MfaSetupResponseBody {
                secret: resp.secret,
                qr_code_url: resp.qr_code_url,
            };
            (StatusCode::OK, Json(body)).into_response()
        }
        Err(err) => {
            error!(error = ?err, "MFA setup failed");
            map_aegis_error(err)
        }
    }
}

// ---------- Token Refresh (not implemented) ----------
#[derive(Debug, Deserialize)]
pub struct TokenRefreshRequest {
    pub refresh_token: String,
}

pub async fn token_refresh<R, O, D>(
    State(_state): State<AegisHandlerState<R, O, D>>,
    IdempotencyKeyHeader(_idempotency_key): IdempotencyKeyHeader,
    AxumJson(_req): AxumJson<TokenRefreshRequest>,
) -> Response
where
    R: UserRepository + Clone + Send + Sync + 'static,
    O: OutboxAppender + Clone + Send + Sync + 'static,
    D: AegisDomain + Clone + Send + Sync + 'static,
{
    warn!("Token refresh not implemented");
    (StatusCode::NOT_IMPLEMENTED, "Token refresh not implemented").into_response()
}

// ---------- Create User (using AppState) ----------
#[derive(Debug, Deserialize)]
pub struct CreateUserAppRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
}

pub async fn create_user_app(
    State(state): State<AppState>,
    IdempotencyKeyHeader(idempotency_key): IdempotencyKeyHeader,
    AxumJson(req): AxumJson<CreateUserAppRequest>,
) -> Response {
    use ataqu_application::aegis_service::CreateUserCommand;
    info!(
        idempotency_key = ?idempotency_key,
        "Create user via AppState"
    );
    let cmd = CreateUserCommand {
        email: req.email,
        password: req.password,
        name: req.name.unwrap_or_else(|| "User".to_string()),
    };
    match state.aegis_service.create_user(cmd).await {
        Ok(resp) => {
            (StatusCode::CREATED, Json(serde_json::json!({
                "user_id": resp.user_id,
                "email": resp.email,
            }))).into_response()
        }
        Err(err) => {
            error!(error = ?err, "User creation failed");
            map_aegis_error(err)
        }
    }
}

// ---------- Error mapping ----------
fn map_aegis_error(err: AegisServiceError) -> Response {
    let err_str = format!("{:?}", err);
    let (status, msg) = if err_str.contains("Validation") {
        (StatusCode::UNPROCESSABLE_ENTITY, err.to_string())
    } else if err_str.contains("Conflict") {
        (StatusCode::CONFLICT, err.to_string())
    } else if err_str.contains("Transient") || err_str.contains("Timeout") {
        (StatusCode::SERVICE_UNAVAILABLE, err.to_string())
    } else if err_str.contains("NotFound") {
        (StatusCode::NOT_FOUND, err.to_string())
    } else if err_str.contains("Unauthorized") {
        (StatusCode::UNAUTHORIZED, err.to_string())
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
    };
    let mut response = (status, Json(serde_json::json!({ "error": msg }))).into_response();
    if err_str.contains("Transient") || err_str.contains("Timeout") {
        response
            .headers_mut()
            .insert("Retry-After", HeaderValue::from_static("5"));
    }
    response
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_dummy() {
        assert_eq!(1, 1);
    }
}

// Routes for the generic AegisHandlerState (not used with AppState)
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(|| async { "Placeholder for $app" }))
}
