use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;

#[derive(Deserialize)]
pub struct TenantQuery {
    pub tenant_id: Uuid,
}

#[derive(Deserialize)]
pub struct CompleteTaskRequest {
    pub tenant_id: Uuid,
    pub task_id: String,
}

pub async fn get_status(
    State(state): State<AppState>,
    Query(query): Query<TenantQuery>,
) -> impl IntoResponse {
    match state.onboarding_service.get_status(query.tenant_id).await {
        Ok(status) => (StatusCode::OK, Json(status)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn complete_task(
    State(state): State<AppState>,
    Json(payload): Json<CompleteTaskRequest>,
) -> impl IntoResponse {
    match state
        .onboarding_service
        .complete_task(payload.tenant_id, payload.task_id)
        .await
    {
        Ok(status) => (StatusCode::OK, Json(status)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

// New endpoint: team status
use chrono::{DateTime, Utc};
use serde::Serialize;
use ataqu_security::PiiAccessKey;

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
        .map_err(|_| ApiResponseError::internal("Failed to fetch onboarding status"))?;

    let user_list = users
        .into_iter()
        .map(|u| TeamStatusUser {
            user_id: u.id,
            name: u.name,
            email: u.email.reveal(&PiiAccessKey::new()).to_string(),
            last_login_at: u.last_login_at.map(|t| DateTime::<Utc>::from(t)),
            role: u.role,
            is_active: u.is_active,
        })
        .collect();

    Ok(Json(TeamStatusResponse {
        users: user_list,
        tenant_progress: status.progress_percentage,
    }))
}
