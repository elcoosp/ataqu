use axum::{
    Json,
    extract::{Query, State},
};
use serde::Deserialize;
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;

/// SECURITY (fixed in audit): the tenant is taken from the authenticated
/// `AuthContext`, never from the query string. The previous version accepted
/// `?tenant_id=…`, letting any authenticated user of tenant A read tenant B's
/// onboarding state (IDOR). The field is still parsed (and ignored) so older
/// clients that append it to the URL keep working.
#[derive(Deserialize)]
pub struct TenantQuery {
    #[allow(dead_code)]
    pub tenant_id: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct CompleteTaskRequest {
    /// Ignored: the tenant always comes from the auth context.
    #[allow(dead_code)]
    pub tenant_id: Option<Uuid>,
    pub task_id: String,
}

pub async fn get_status(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(_query): Query<TenantQuery>,
) -> ApiResult<Json<ataqu_domain_onboarding::OnboardingStatus>> {
    let status = state
        .onboarding_service
        .get_status(auth.tenant_id.as_uuid())
        .await
        .map_err(ApiResponseError::internal_err)?;
    Ok(Json(status))
}

pub async fn complete_task(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CompleteTaskRequest>,
) -> ApiResult<Json<ataqu_domain_onboarding::OnboardingStatus>> {
    let status = state
        .onboarding_service
        .complete_task(auth.tenant_id.as_uuid(), payload.task_id)
        .await
        .map_err(ApiResponseError::internal_err)?;
    Ok(Json(status))
}

// New endpoint: team status
use ataqu_security::PiiAccessKey;
use chrono::{DateTime, Utc};
use serde::Serialize;

#[derive(Serialize)]
pub struct TeamStatusUser {
    pub user_id: Uuid,
    pub name: Option<String>,
    pub email: String,
    pub last_login_at: Option<DateTime<Utc>>,
    pub role: String,
    pub is_active: bool,
}

#[derive(Serialize)]
pub struct TeamStatusResponse {
    pub users: Vec<TeamStatusUser>,
    pub tenant_progress: f32,
}

pub async fn team_status(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<TeamStatusResponse>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }

    let users = state
        .aegis_service
        .list_users(auth.tenant_id)
        .await
        .map_err(|_| ApiResponseError::internal("Failed to fetch users"))?;

    let status = state
        .onboarding_service
        .get_status(auth.tenant_id.as_uuid())
        .await
        .map_err(ApiResponseError::internal_err)?;

    let user_list = users
        .into_iter()
        .map(|u| TeamStatusUser {
            user_id: u.id,
            name: u.name,
            email: u.email.reveal(&PiiAccessKey::new()).to_string(),
            last_login_at: u.last_login_at.map(DateTime::<Utc>::from),
            role: u.role,
            is_active: u.is_active,
        })
        .collect();

    Ok(Json(TeamStatusResponse {
        users: user_list,
        tenant_progress: status.progress_percentage,
    }))
}
