//! AEGIS API handlers using AuthContext.

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use chrono::{DateTime, Utc};
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
        tenant_id: auth.tenant_id,
        email: email.clone(),
        password: req.password,
        name: req.name,
    };
    match state.aegis_service.create_user(cmd).await {
        Ok(resp) => Ok((
            StatusCode::CREATED,
            Json(serde_json::json!({
                "user_id": resp.user_id,
                "email": crate::serializers::ApiEmail(resp.email.clone()),
            })),
        )),
        Err(err) => {
            error!(error = ?err, "User creation failed");
            Err(map_aegis_error(err))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateRoleRequest {
    pub name: String,
    #[serde(default)]
    pub permissions: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct RoleResponse {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub permissions: Vec<String>,
    pub created_at: DateTime<Utc>,
}

pub async fn list_roles(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<RoleResponse>>> {
    use sqlx::Row;
    let pool = state.db.get_postgres_connection_pool();
    let rows = sqlx::query(
		"SELECT id, tenant_id, name, permissions, created_at FROM core.roles WHERE tenant_id = $1 ORDER BY created_at DESC",
	)
	.bind(auth.tenant_id.as_uuid())
	.fetch_all(pool)
	.await
	.map_err(|_| ApiResponseError::internal("Failed to list roles"))?;
    let list = rows
        .into_iter()
        .map(|r| RoleResponse {
            id: r.get::<Uuid, _>("id"),
            tenant_id: r.get::<Uuid, _>("tenant_id"),
            name: r.get::<String, _>("name"),
            permissions: serde_json::from_value(r.get::<serde_json::Value, _>("permissions"))
                .unwrap_or_default(),
            created_at: r.get::<DateTime<Utc>, _>("created_at"),
        })
        .collect();
    Ok(Json(list))
}

pub async fn create_role(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<CreateRoleRequest>,
) -> ApiResult<(StatusCode, Json<RoleResponse>)> {
    use sqlx::Row;
    let id = Uuid::new_v4();
    let pool = state.db.get_postgres_connection_pool();
    sqlx::query(
        "INSERT INTO core.roles (id, tenant_id, name, permissions) VALUES ($1, $2, $3, $4)",
    )
    .bind(id)
    .bind(auth.tenant_id.as_uuid())
    .bind(&req.name)
    .bind(serde_json::json!(req.permissions))
    .execute(pool)
    .await
    .map_err(|_| ApiResponseError::internal("Failed to create role"))?;
    let row = sqlx::query(
        "SELECT id, tenant_id, name, permissions, created_at FROM core.roles WHERE id = $1",
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|_| ApiResponseError::internal("Failed to read role"))?;
    Ok((
        StatusCode::CREATED,
        Json(RoleResponse {
            id: row.get::<Uuid, _>("id"),
            tenant_id: row.get::<Uuid, _>("tenant_id"),
            name: row.get::<String, _>("name"),
            permissions: serde_json::from_value(row.get::<serde_json::Value, _>("permissions"))
                .unwrap_or_default(),
            created_at: row.get::<DateTime<Utc>, _>("created_at"),
        }),
    ))
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
    Ok(StatusCode::NO_CONTENT)
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
        Domain(_e) => ApiResponseError::internal("An unexpected error occurred"),
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
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<SsoLoginRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    use ataqu_domain_aegis::sso::SsoProvider;
    let provider = match req.provider.as_str() {
        "google" => SsoProvider::Google,
        "microsoft" => SsoProvider::Microsoft,
        _ => return Err(ApiResponseError::validation("Invalid provider")),
    };

    let config = state.sso_config.clone();

    let sso_state = uuid::Uuid::new_v4().to_string();
    let provider_str = match provider {
        SsoProvider::Google => "Google",
        SsoProvider::Microsoft => "Microsoft",
    };
    // Store provider and tenant_id as JSON
    let state_data = serde_json::json!({
        "provider": provider_str,
        "tenant_id": auth.tenant_id.as_uuid(),
    });
    state
        .sso_states
        .insert(sso_state.clone(), state_data.to_string());
    let redirect = ataqu_domain_aegis::sso::build_authorization_url(&provider, &config, &sso_state);

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

#[derive(Debug, serde::Deserialize)]
struct OAuthTokenResponse {
    access_token: String,
}

#[derive(Debug, serde::Deserialize)]
struct GoogleUserInfo {
    email: String,
}

#[derive(Debug, serde::Deserialize)]
struct MicrosoftUserInfo {
    mail: Option<String>,
    user_principal_name: Option<String>,
}

pub async fn sso_callback(
    State(state): State<AppState>,
    Json(req): Json<SsoCallbackRequest>,
) -> ApiResult<Json<LoginResponse>> {
    let state_data_str = state
        .sso_states
        .get(&req.state)
        .ok_or_else(|| ApiResponseError::unauthorized("Invalid or expired SSO state"))?
        .clone();
    state.sso_states.invalidate(&req.state);

    let state_data: serde_json::Value = serde_json::from_str(&state_data_str)
        .map_err(|_| ApiResponseError::unauthorized("Invalid SSO state data"))?;
    let provider_str = state_data["provider"]
        .as_str()
        .ok_or_else(|| ApiResponseError::unauthorized("Missing provider in SSO state"))?;

    let config = state.sso_config.clone();
    let client = state.http_client.clone();

    let email_str = if provider_str == "Google" {
        let token_resp = client
            .post("https://oauth2.googleapis.com/token")
            .form(&[
                ("code", req.code.as_str()),
                ("client_id", config.google_client_id.as_str()),
                ("client_secret", config.google_client_secret.as_str()),
                ("redirect_uri", config.google_redirect_uri.as_str()),
                ("grant_type", "authorization_code"),
            ])
            .send()
            .await
            .map_err(|_| ApiResponseError::internal("SSO token exchange failed"))?
            .json::<OAuthTokenResponse>()
            .await
            .map_err(|_| ApiResponseError::internal("SSO token parse failed"))?;

        let user_info = client
            .get("https://www.googleapis.com/oauth2/v3/userinfo")
            .bearer_auth(token_resp.access_token)
            .send()
            .await
            .map_err(|_| ApiResponseError::internal("SSO user info fetch failed"))?
            .json::<GoogleUserInfo>()
            .await
            .map_err(|_| ApiResponseError::internal("SSO user info parse failed"))?;
        user_info.email
    } else if provider_str == "Microsoft" {
        let token_resp = client
            .post("https://login.microsoftonline.com/common/oauth2/v2.0/token")
            .form(&[
                ("code", req.code.as_str()),
                ("client_id", config.microsoft_client_id.as_str()),
                ("client_secret", config.microsoft_client_secret.as_str()),
                ("redirect_uri", config.microsoft_redirect_uri.as_str()),
                ("grant_type", "authorization_code"),
                ("scope", "https://graph.microsoft.com/User.Read"),
            ])
            .send()
            .await
            .map_err(|_| ApiResponseError::internal("SSO token exchange failed"))?
            .json::<OAuthTokenResponse>()
            .await
            .map_err(|_| ApiResponseError::internal("SSO token parse failed"))?;

        let user_info = client
            .get("https://graph.microsoft.com/oidc/userinfo")
            .bearer_auth(token_resp.access_token)
            .send()
            .await
            .map_err(|_| ApiResponseError::internal("SSO user info fetch failed"))?
            .json::<MicrosoftUserInfo>()
            .await
            .map_err(|_| ApiResponseError::internal("SSO user info parse failed"))?;
        user_info
            .mail
            .or(user_info.user_principal_name)
            .unwrap_or_default()
    } else {
        return Err(ApiResponseError::unauthorized("Invalid SSO provider"));
    };

    let email = Email::new(email_str);
    let resp = state
        .aegis_service
        .sso_exchange_with_tenant_resolution(email)
        .await
        .map_err(map_aegis_error)?;

    Ok(Json(LoginResponse {
        access_token: resp.access_token,
        refresh_token: resp.refresh_token,
        user_id: resp.user_id,
    }))
}
#[derive(Debug, Deserialize)]
pub struct UpdateRoleRequest {
    pub role: String,
}

pub async fn get_permission_matrix(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let matrix = state
        .aegis_service
        .get_permission_matrix(auth.tenant_id)
        .await
        .map_err(map_aegis_error)?;
    Ok(Json(matrix))
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
        .list_users(auth.tenant_id)
        .await
        .map_err(map_aegis_error)?;
    let resp = users
        .into_iter()
        .map(|u| {
            serde_json::json!({
                "id": u.id,
                "email": crate::serializers::ApiEmail(u.email.clone()),
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
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateRoleRequest>,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }

    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    if !["admin", "member", "viewer"].contains(&req.role.as_str()) {
        return Err(ApiResponseError::validation("Invalid role"));
    }
    state
        .aegis_service
        .update_user_role(auth.tenant_id, user_id, req.role, if_match)
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
        .deactivate_user(auth.tenant_id, user_id)
        .await
        .map_err(map_aegis_error)?;
    Ok(StatusCode::NO_CONTENT)
}

/// SECURITY NOTE: The JWT blocklist is in-memory (moka cache). On server restart,
/// all revoked tokens become valid again until their TTL expires.
/// [VULN-002] For production, this should be replaced with a Redis-backed blocklist.
pub async fn logout(
    State(state): State<AppState>,
    auth: AuthContext,
    _headers: axum::http::HeaderMap,
) -> ApiResult<StatusCode> {
    // [VULN-006] Durable revocation: increment user version to invalidate all existing tokens.
    // This is checked against the DB on every request, so it's immediate and survives restarts.
    state
        .aegis_service
        .increment_user_version(auth.user_id)
        .await
        .map_err(map_aegis_error)?;

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub scopes: Option<Vec<String>>,
    pub expires_at: Option<std::time::SystemTime>,
}

pub async fn create_api_key(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<CreateApiKeyRequest>,
) -> ApiResult<(StatusCode, Json<serde_json::Value>)> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let scopes = req.scopes.unwrap_or_default();
    for scope in &scopes {
        if !["read", "write", "admin"].contains(&scope.as_str()) {
            return Err(ApiResponseError::validation("Invalid scope"));
        }
    }

    let key = state
        .aegis_service
        .create_api_key(
            auth.tenant_id,
            auth.user_id,
            req.name,
            req.expires_at,
            scopes,
        )
        .await
        .map_err(map_aegis_error)?;
    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "id": key.id,
            "name": key.name,
            "key": key.key,
            "prefix": key.prefix,
            "scopes": key.scopes,
        })),
    ))
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
        .delete_api_key(auth.tenant_id, auth.user_id, id)
        .await
        .map_err(map_aegis_error)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct RequestPasswordResetRequest {
    pub email: String,
}

pub async fn request_password_reset(
    State(state): State<AppState>,
    Json(req): Json<RequestPasswordResetRequest>,
) -> ApiResult<StatusCode> {
    let email = Email::new(req.email);
    state
        .aegis_service
        .request_password_reset(email)
        .await
        .map_err(map_aegis_error)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

pub async fn reset_password(
    State(state): State<AppState>,
    Json(req): Json<ResetPasswordRequest>,
) -> ApiResult<StatusCode> {
    state
        .aegis_service
        .reset_password(&req.token, req.new_password)
        .await
        .map_err(map_aegis_error)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    pub action: Option<String>,
    pub app: Option<String>,
    pub from_date: Option<chrono::DateTime<chrono::Utc>>,
    pub to_date: Option<chrono::DateTime<chrono::Utc>>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn get_audit_log(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(query): Query<AuditLogQuery>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let limit = query.limit.unwrap_or(100);
    let offset = query.offset.unwrap_or(0);
    let logs = state
        .aegis_service
        .get_audit_logs(
            auth.tenant_id,
            limit,
            offset,
            query.action,
            query.app,
            query.from_date,
            query.to_date,
        )
        .await
        .map_err(map_aegis_error)?;
    let resp = logs
        .into_iter()
        .map(|l| {
            serde_json::json!({
                "tenant_id": l.tenant_id,
                "user_id": l.user_id,
                "action": l.action,
                "app": l.app,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "old_value": l.old_value,
                "new_value": l.new_value,
                "ip_address": l.ip_address,
                "user_agent": l.user_agent,
                "created_at": l.created_at,
            })
        })
        .collect();
    Ok(Json(resp))
}

pub async fn export_audit_log(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(query): Query<AuditLogQuery>,
) -> ApiResult<impl axum::response::IntoResponse> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let limit = query.limit.unwrap_or(1000); // allow larger for export
    let offset = query.offset.unwrap_or(0);
    let logs = state
        .aegis_service
        .get_audit_logs(
            auth.tenant_id,
            limit,
            offset,
            query.action,
            query.app,
            query.from_date,
            query.to_date,
        )
        .await
        .map_err(map_aegis_error)?;

    // Export as CSV
    use csv::Writer;
    let mut wtr = Writer::from_writer(vec![]);
    wtr.write_record([
        "id",
        "user_id",
        "action",
        "app",
        "entity_type",
        "entity_id",
        "old_value",
        "new_value",
        "ip_address",
        "user_agent",
        "created_at",
    ])
    .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for l in &logs {
        wtr.write_record([
            &l.id.to_string(),
            &l.user_id.to_string(),
            &l.action,
            &l.app,
            l.entity_type.as_deref().unwrap_or(""),
            &l.entity_id.map(|id| id.to_string()).unwrap_or_default(),
            &l.old_value
                .as_ref()
                .map(|v| v.to_string())
                .unwrap_or_default(),
            &l.new_value
                .as_ref()
                .map(|v| v.to_string())
                .unwrap_or_default(),
            &l.ip_address.map(|ip| ip.to_string()).unwrap_or_default(),
            l.user_agent.as_deref().unwrap_or(""),
            &l.created_at.to_rfc3339(),
        ])
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    }
    let data = String::from_utf8(
        wtr.into_inner()
            .map_err(|e| ApiResponseError::internal(&e.to_string()))?,
    )
    .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    let headers = [
        (axum::http::header::CONTENT_TYPE, "text/csv".to_string()),
        (
            axum::http::header::CONTENT_DISPOSITION,
            "attachment; filename=\"audit_log.csv\"".to_string(),
        ),
    ];
    Ok((StatusCode::OK, headers, data))
}

#[derive(Debug, Deserialize)]
pub struct UpdatePermissionRequest {
    pub role: String, // "admin", "editor", "viewer", "none"
}

pub async fn update_permission(
    State(state): State<AppState>,
    auth: AuthContext,
    Path((user_id, app)): Path<(Uuid, String)>,
    Json(req): Json<UpdatePermissionRequest>,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }

    // Validate app
    const VALID_APPS: &[&str] = &[
        "aegis", "cinq", "dial", "pause", "pivot", "sond", "spark", "tempo", "vault", "vista",
    ];
    if !VALID_APPS.contains(&app.as_str()) {
        return Err(ApiResponseError::validation("Invalid app"));
    }

    state
        .aegis_service
        .update_user_permission(auth.tenant_id, user_id, app, req.role)
        .await
        .map_err(map_aegis_error)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize, Default)]
pub struct UpdateTenantSettingsRequest {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct TenantSettingsResponse {
	pub id: Uuid,
	pub tenant_id: Uuid,
	pub name: String,
	pub plan: String,
	pub settings: serde_json::Value,
	pub updated_at: DateTime<Utc>,
}

pub async fn get_tenant_settings(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<TenantSettingsResponse>> {
    use sqlx::Row;
    let pool = state.db.get_postgres_connection_pool();
    let row = sqlx::query(
		"SELECT id, tenant_id, name, settings, updated_at FROM core.tenant_settings WHERE tenant_id = $1",
	)
	.bind(auth.tenant_id.as_uuid())
	.fetch_optional(pool)
	.await
	.map_err(|_| ApiResponseError::internal("Failed to read tenant settings"))?;
    let resp = match row {
    	Some(r) => TenantSettingsResponse {
    		id: r.get::<Uuid, _>("id"),
    		tenant_id: r.get::<Uuid, _>("tenant_id"),
    		name: r.get::<String, _>("name"),
    		plan: "standard".to_string(),
    		settings: r.get::<serde_json::Value, _>("settings"),
    		updated_at: r.get::<DateTime<Utc>, _>("updated_at"),
    	},
    	None => TenantSettingsResponse {
    		id: Uuid::new_v4(),
    		tenant_id: auth.tenant_id.as_uuid(),
    		name: String::new(),
    		plan: "standard".to_string(),
    		settings: serde_json::json!({}),
    		updated_at: Utc::now(),
    	},
    };
    Ok(Json(resp))
}

pub async fn update_tenant_settings(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<UpdateTenantSettingsRequest>,
) -> ApiResult<Json<TenantSettingsResponse>> {
    use sqlx::Row;
    let pool = state.db.get_postgres_connection_pool();
    let existing =
        sqlx::query("SELECT id, name, settings FROM core.tenant_settings WHERE tenant_id = $1")
            .bind(auth.tenant_id.as_uuid())
            .fetch_optional(pool)
            .await
            .map_err(|_| ApiResponseError::internal("Failed to read tenant settings"))?;
    let (id, name, settings) = match existing {
        Some(r) => (
            r.get::<Uuid, _>("id"),
            req.name.unwrap_or_else(|| r.get::<String, _>("name")),
            match req.settings {
                Some(s) => s,
                None => r.get::<serde_json::Value, _>("settings"),
            },
        ),
        None => (
            Uuid::new_v4(),
            req.name.unwrap_or_default(),
            req.settings.unwrap_or_else(|| serde_json::json!({})),
        ),
    };
    sqlx::query(
		"INSERT INTO core.tenant_settings (id, tenant_id, name, settings, updated_at) VALUES ($1, $2, $3, $4, now())
		 ON CONFLICT (tenant_id) DO UPDATE SET name = EXCLUDED.name, settings = EXCLUDED.settings, updated_at = now()",
	)
	.bind(id)
	.bind(auth.tenant_id.as_uuid())
	.bind(&name)
	.bind(&settings)
	.execute(pool)
	.await
	.map_err(|_| ApiResponseError::internal("Failed to update tenant settings"))?;
    let row = sqlx::query(
		"SELECT id, tenant_id, name, settings, updated_at FROM core.tenant_settings WHERE tenant_id = $1",
	)
	.bind(auth.tenant_id.as_uuid())
	.fetch_one(pool)
	.await
	.map_err(|_| ApiResponseError::internal("Failed to read tenant settings"))?;
    Ok(Json(TenantSettingsResponse {
        id: row.get::<Uuid, _>("id"),
        tenant_id: row.get::<Uuid, _>("tenant_id"),
        name: row.get::<String, _>("name"),
        plan: "standard".to_string(),
        settings: row.get::<serde_json::Value, _>("settings"),
        updated_at: row.get::<DateTime<Utc>, _>("updated_at"),
    }))
}

#[derive(Debug, Deserialize)]
pub struct InviteUserRequest {
    pub email: String,
    #[serde(default)]
    pub role: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InviteUserResponse {
    pub user_id: Uuid,
    pub email: String,
}

pub async fn invite_user(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<InviteUserRequest>,
) -> ApiResult<(StatusCode, Json<InviteUserResponse>)> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let email = ataqu_security::Email::new(req.email);
    let cmd = ataqu_application::aegis_service::CreateUserCommand {
        tenant_id: auth.tenant_id,
        email: email.clone(),
        password: Uuid::new_v4().to_string(),
        name: None,
    };
    match state.aegis_service.create_user(cmd).await {
        Ok(resp) => Ok((
            StatusCode::CREATED,
            Json(InviteUserResponse {
                user_id: resp.user_id,
                email: resp.email.to_string(),
            }),
        )),
        Err(err) => Err(map_aegis_error(err)),
    }
}

pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::{delete, get, patch, post};
    axum::Router::new()
        .route("/audit-log", get(get_audit_log))
        .route("/users", post(create_user).get(list_users))
        .route("/users/:id/role", patch(update_user_role))
        .route("/users/:id/deactivate", post(deactivate_user))
        .route("/roles", post(create_role).get(list_roles))
        .route(
            "/tenant/settings",
            get(get_tenant_settings).patch(update_tenant_settings),
        )
        .route("/users/invite", post(invite_user))
        .route("/logout", post(logout))
        .route("/mfa/setup", post(mfa_setup))
        .route("/mfa/verify", post(mfa_verify))
        .route("/api-keys", post(create_api_key).get(list_api_keys))
        .route("/api-keys/:id", delete(delete_api_key))
        .route("/permission-matrix", get(get_permission_matrix))
        .route("/permissions/:user_id/:app", patch(update_permission))
        .nest("/approvals", approval_routes())
}

pub fn public_routes() -> axum::Router<crate::AppState> {
    use axum::routing::post;
    axum::Router::new()
        .route("/password-reset/request", post(request_password_reset))
        .route("/password-reset/confirm", post(reset_password))
        .route("/sso/login", post(sso_login))
        .route("/sso/callback", post(sso_callback))
        .route("/login", post(login))
        .route("/refresh", post(refresh_token))
}

// ============================================================================
// Approval endpoints for SPARK workflows
// ============================================================================

// use serde::Deserialize; // already imported at top
// use ataqu_application::approval_worker::ApprovalWorker; // not used

#[derive(Debug, Deserialize)]
pub struct ApproveRequest {
    pub run_id: Uuid,
}

pub async fn approve_workflow(
    State(state): State<crate::AppState>,
    auth: AuthContext,
    Json(req): Json<ApproveRequest>,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }

    // Approve the pending run and mark the `pending_approvals` row as approved
    // by the acting user. The service resumes the workflow on success.
    state
        .spark_service
        .approve_workflow_run(auth.tenant_id, req.run_id, auth.user_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok(StatusCode::OK)
}

pub async fn reject_workflow(
    State(state): State<crate::AppState>,
    auth: AuthContext,
    Json(req): Json<ApproveRequest>,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }

    // Reject the pending run: mark the `pending_approvals` row as rejected and
    // set the workflow run status to `Rejected`. The run is not resumed.
    state
        .spark_service
        .reject_workflow_run(auth.tenant_id, req.run_id, auth.user_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

pub fn approval_routes() -> axum::Router<crate::AppState> {
    use axum::routing::post;
    axum::Router::new()
        .route("/approve", post(approve_workflow))
        .route("/reject", post(reject_workflow))
}
