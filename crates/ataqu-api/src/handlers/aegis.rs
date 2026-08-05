//! AEGIS API handlers using AuthContext.

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_application::aegis_service::{AegisServiceError, AuthenticateCommand, CreateUserCommand};
use ataqu_security::Email;

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
}

pub async fn create_user(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<CreateUserRequest>,
) -> ApiResult<(StatusCode, Json<serde_json::Value>)> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    info!("Create user request");
    let email = Email::new(req.email);
    let cmd = CreateUserCommand {
        tenant_id: auth.tenant_id, // Fix: use auth context
        email: email.clone(),
        password: req.password,
        name: req.name,
    };
    match state.aegis_service.create_user(cmd).await {
        Ok(resp) => Ok((
            StatusCode::CREATED,
            Json(serde_json::json!({
                "user_id": resp.user_id,
                "email": crate::serializers::ApiEmail::new(resp.email), // Fix: use ApiEmail wrapper
            })),
        )),
        Err(err) => {
            error!(error = ?err, "User creation failed");
            Err(map_aegis_error(err))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub totp_code: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: Uuid,
}

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> ApiResult<Json<LoginResponse>> {
    info!("Login attempt");
    let cmd = AuthenticateCommand {
        email: Email::new(req.email),
        password: req.password,
        totp_code: req.totp_code,
        tenant_id: None,
    };
    match state.aegis_service.authenticate(cmd).await {
        Ok(resp) => Ok(Json(LoginResponse {
            access_token: resp.access_token,
            refresh_token: resp.refresh_token,
            user_id: resp.user_id,
        })),
        Err(err) => {
            error!(error = ?err, "Login failed");
            Err(map_aegis_error(err))
        }
    }
}

#[derive(Debug, Serialize)]
pub struct MfaSetupResponse {
    pub secret: String,
    pub qr_code_url: String,
}

pub async fn mfa_setup(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<MfaSetupResponse>> {
    info!(user_id = ?auth.user_id, "MFA setup request");
    match state.aegis_service.setup_mfa(auth.user_id).await {
        Ok(resp) => Ok(Json(MfaSetupResponse {
            secret: resp.secret,
            qr_code_url: resp.qr_code_url,
        })),
        Err(err) => {
            error!(error = ?err, "MFA setup failed");
            Err(map_aegis_error(err))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct MfaVerifyRequest {
    pub code: String,
}

pub async fn mfa_verify(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<MfaVerifyRequest>,
) -> ApiResult<StatusCode> {
    state
        .aegis_service
        .verify_mfa(auth.user_id, &req.code)
        .await
        .map_err(map_aegis_error)?;
    Ok(StatusCode::OK)
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

pub async fn refresh_token(
    State(state): State<AppState>,
    Json(req): Json<RefreshTokenRequest>,
) -> ApiResult<Json<LoginResponse>> {
    let resp = state
        .aegis_service
        .refresh_token(&req.refresh_token)
        .await
        .map_err(map_aegis_error)?;
    Ok(Json(LoginResponse {
        access_token: resp.access_token,
        refresh_token: resp.refresh_token,
        user_id: resp.user_id,
    }))
}

fn map_aegis_error(err: AegisServiceError) -> ApiResponseError {
    use AegisServiceError::*;
    match err {
        Validation(msg) => ApiResponseError::validation(&msg),
        AuthenticationFailed => ApiResponseError::unauthorized("Authentication failed"),
        MfaSetupFailed(msg) => ApiResponseError::validation(&msg),
        Database(msg) => ApiResponseError::internal(&msg),
        Outbox(msg) => ApiResponseError::internal(&msg),
        Domain(e) => ApiResponseError::internal(&e.to_string()),
        NotFound(msg) => ApiResponseError::not_found(&msg),
        Conflict(msg) => ApiResponseError::conflict(&msg),
        MfaRequired => ApiResponseError::unauthorized("MFA required"),
        Internal(msg) => ApiResponseError::internal(&msg),
    }
}

#[derive(Debug, Deserialize)]
pub struct SsoLoginRequest {
    pub provider: String,
}

pub async fn sso_login(
    State(_state): State<AppState>,
    Json(req): Json<SsoLoginRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let provider = match req.provider.as_str() {
        "google" => ataqu_domain_aegis::sso::SsoProvider::Google,
        "microsoft" => ataqu_domain_aegis::sso::SsoProvider::Microsoft,
        _ => return Err(ApiResponseError::validation("Invalid provider")),
    };

    let config = ataqu_domain_aegis::sso::SsoConfig {
        google_client_id: std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
        google_client_secret: std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default(),
        google_redirect_uri: std::env::var("GOOGLE_REDIRECT_URI").unwrap_or_default(),
        microsoft_client_id: std::env::var("MICROSOFT_CLIENT_ID").unwrap_or_default(),
        microsoft_client_secret: std::env::var("MICROSOFT_CLIENT_SECRET").unwrap_or_default(),
        microsoft_redirect_uri: std::env::var("MICROSOFT_REDIRECT_URI").unwrap_or_default(),
    };

    let state = uuid::Uuid::new_v4().to_string();
    let redirect = ataqu_domain_aegis::sso::build_authorization_url(&provider, &config, &state);

    Ok(Json(serde_json::json!({
        "url": redirect.url,
        "state": redirect.state,
    })))
}

#[derive(Debug, Deserialize)]
pub struct SsoCallbackRequest {
    pub code: String,
    pub state: String,
}

pub async fn sso_callback(
    State(_state): State<AppState>,
    Json(_req): Json<SsoCallbackRequest>,
) -> ApiResult<Json<LoginResponse>> {
    // SSO token exchange and user profile fetch are not yet implemented.
    Err(ApiResponseError::Internal(
        "SSO callback not fully implemented".to_string(),
    ))
}

#[derive(Debug, Deserialize)]
pub struct UpdateRoleRequest {
    pub role: String,
}

pub async fn list_users(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let users = state
        .aegis_service
        .list_users(auth.tenant_id.as_uuid())
        .await
        .map_err(map_aegis_error)?;
    let resp = users
        .into_iter()
        .map(|u| {
            serde_json::json!({
                "id": u.id,
                "email": crate::serializers::ApiEmail::new(u.email),
                "name": u.name,
                "role": u.role,
                "is_active": u.is_active,
                "mfa_enabled": u.mfa_enabled,
            })
        })
        .collect();
    Ok(Json(resp))
}

pub async fn update_user_role(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(user_id): Path<Uuid>,
    Json(req): Json<UpdateRoleRequest>,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    if !["admin", "member", "viewer"].contains(&req.role.as_str()) {
        return Err(ApiResponseError::validation("Invalid role"));
    }
    state
        .aegis_service
        .update_user_role(user_id, req.role)
        .await
        .map_err(map_aegis_error)?;
    Ok(StatusCode::OK)
}

pub async fn deactivate_user(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(user_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    state
        .aegis_service
        .deactivate_user(user_id)
        .await
        .map_err(map_aegis_error)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn logout(State(_state): State<AppState>, _auth: AuthContext) -> ApiResult<StatusCode> {
    // ADR-003: Stateless JWT. Token revocation requires a blocklist.
    // For MLP, we rely on short-lived access tokens (15 min).
    // Client should just discard the token.
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub scopes: Option<Vec<String>>,
}

pub async fn create_api_key(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<CreateApiKeyRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let key = state
        .aegis_service
        .create_api_key(
            auth.tenant_id,
            auth.user_id,
            req.name,
            None,
            req.scopes.unwrap_or_default(),
        )
        .await
        .map_err(map_aegis_error)?;
    Ok(Json(serde_json::json!({
        "id": key.id,
        "name": key.name,
        "key": key.key,
        "prefix": key.prefix,
        "scopes": key.scopes,
    })))
}

pub async fn list_api_keys(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let keys = state
        .aegis_service
        .list_api_keys(auth.tenant_id, auth.user_id)
        .await
        .map_err(map_aegis_error)?;
    let resp = keys
        .into_iter()
        .map(|k| {
            serde_json::json!({
                "id": k.id,
                "name": k.name,
                "prefix": k.prefix,
                "created_at": k.created_at,
            })
        })
        .collect();
    Ok(Json(resp))
}

pub async fn delete_api_key(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .aegis_service
        .delete_api_key(auth.tenant_id, id)
        .await
        .map_err(map_aegis_error)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct RequestPasswordResetRequest {
    pub email: String,
}

pub async fn request_password_reset(
    State(_state): State<AppState>,
    Json(req): Json<RequestPasswordResetRequest>,
) -> ApiResult<StatusCode> {
    tracing::info!(email = %req.email, "Password reset requested (stub)");
    Ok(StatusCode::OK)
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

pub async fn reset_password(
    State(_state): State<AppState>,
    Json(_req): Json<ResetPasswordRequest>,
) -> ApiResult<StatusCode> {
    Ok(StatusCode::OK)
}

pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::{delete, patch, post};
    axum::Router::new()
        .route("/users", post(create_user).get(list_users))
        .route("/users/:id/role", patch(update_user_role))
        .route("/users/:id/deactivate", post(deactivate_user))
        .route("/logout", post(logout))
        .route("/login", post(login))
        .route("/sso/login", post(sso_login))
        .route("/sso/callback", post(sso_callback))
        .route("/refresh", post(refresh_token))
        .route("/mfa/setup", post(mfa_setup))
        .route("/mfa/verify", post(mfa_verify))
        .route("/api-keys", post(create_api_key).get(list_api_keys))
        .route("/api-keys/:id", delete(delete_api_key))
        .route("/password-reset/request", post(request_password_reset))
        .route("/password-reset/confirm", post(reset_password))
}
