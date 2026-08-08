use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::AppState;

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
