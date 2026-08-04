//! AEGIS API handlers.
//! Uses AppState to access the service (no generics).

use axum::{
    Json as AxumJson,
    extract::State,
    http::{HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Json, Response},
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};
use rand::distributions::Alphanumeric;
use rand::thread_rng;
use rand::Rng;
use uuid::Uuid;

use ataqu_application::aegis_service::{
    AegisServiceError, AuthenticateCommand, SetupMfaCommand, CreateUserCommand,
};
use ataqu_security::Email;
use crate::AppState;

// ---------- Create User ----------
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(req): Json<CreateUserRequest>,
) -> Response {
    info!("Create user request");
    let cmd = CreateUserCommand {
        email: Email::new(req.email),
        password_hash: req.password,
        name: req.name,
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

// ---------- Login ----------
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

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Response {
    info!(tenant_id = ?req.tenant_id, "Login attempt");
    let cmd = AuthenticateCommand {
        email: Email::new(req.email),
        password_plain: req.password,
    };
    match state.aegis_service.authenticate(cmd).await {
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

pub async fn mfa_setup(
    State(state): State<AppState>,
    Json(req): Json<MfaSetupRequest>,
) -> Response {
    info!(user_id = ?req.user_id, "MFA setup request");
    let secret: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();
    let cmd = SetupMfaCommand { user_id: req.user_id, totp_secret: secret };
    match state.aegis_service.setup_mfa(cmd).await {
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

// ---------- Error mapping ----------
fn map_aegis_error(err: AegisServiceError) -> Response {
    let (status, msg) = match &err {
        AegisServiceError::Validation(_) => (StatusCode::UNPROCESSABLE_ENTITY, err.to_string()),
        AegisServiceError::AuthenticationFailed => (StatusCode::UNAUTHORIZED, err.to_string()),
        AegisServiceError::MfaSetupFailed(_) => (StatusCode::BAD_REQUEST, err.to_string()),
        AegisServiceError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
        AegisServiceError::Outbox(_) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
        AegisServiceError::Domain(_) => (StatusCode::UNAUTHORIZED, err.to_string()),
    };
    let mut response = (status, Json(serde_json::json!({ "error": msg }))).into_response();
    if matches!(err, AegisServiceError::Database(_) | AegisServiceError::Outbox(_)) {
        response
            .headers_mut()
            .insert("Retry-After", HeaderValue::from_static("5"));
    }
    response
}

// ---------- Routes ----------
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::{post};
    axum::Router::new()
        .route("/users", post(create_user))
        .route("/login", post(login))
        .route("/mfa/setup", post(mfa_setup))
}
