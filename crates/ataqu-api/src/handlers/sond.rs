use ataqu_kernel::TenantId;
use axum::{
    Router,
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub fn router() -> Router<crate::AppState> {
    Router::new()
        .route("/forms", post(create_form))
        .route("/forms/:form_id/submissions", post(create_submission))
        .route("/forms/:form_id/export", get(export_form))
}

/// Extracts the Idempotency-Key header and maps it to a deterministic command_id via UUIDv5.
/// Returns 400 Bad Request if the header is missing or invalid.
fn extract_command_id(headers: &HeaderMap) -> Result<Uuid, StatusCode> {
    let key_str = headers
        .get("Idempotency-Key")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::BAD_REQUEST)?;

    // Map to a deterministic command_id via Uuid::new_v5 as per ADR-006
    Ok(Uuid::new_v5(&Uuid::NAMESPACE_OID, key_str.as_bytes()))
}

#[derive(Deserialize, Serialize)]
pub struct CreateFormRequest {
    pub name: String,
}

pub async fn create_form(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateFormRequest>,
) -> impl IntoResponse {
    let command_id = match extract_command_id(&headers) {
        Ok(id) => id,
        Err(status) => {
            return (status, "Missing or invalid Idempotency-Key header").into_response();
        }
    };

    // Placeholder: In production, tenant_id is extracted from auth middleware
    let tenant_id = TenantId::new(Uuid::new_v4());

    match state
        .sond_service
        .create_form(
            &tenant_id,
            command_id,
            serde_json::to_value(payload).unwrap(),
        )
        .await
    {
        Ok(form_id) => (
            StatusCode::CREATED,
            Json(serde_json::json!({ "id": form_id })),
        )
            .into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create form").into_response(),
    }
}

#[derive(Deserialize, Serialize)]
pub struct CreateSubmissionRequest {
    pub responses: serde_json::Value,
}

pub async fn create_submission(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    axum::extract::Path(form_id): axum::extract::Path<Uuid>,
    Json(payload): Json<CreateSubmissionRequest>,
) -> impl IntoResponse {
    let command_id = match extract_command_id(&headers) {
        Ok(id) => id,
        Err(status) => {
            return (status, "Missing or invalid Idempotency-Key header").into_response();
        }
    };

    let tenant_id = TenantId::new(Uuid::new_v4());

    match state
        .sond_service
        .create_submission(&tenant_id, form_id, command_id, payload.responses)
        .await
    {
        Ok(submission_id) => (
            StatusCode::CREATED,
            Json(serde_json::json!({ "id": submission_id })),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to create submission",
        )
            .into_response(),
    }
}

pub async fn export_form(
    State(state): State<crate::AppState>,
    axum::extract::Path(form_id): axum::extract::Path<Uuid>,
) -> impl IntoResponse {
    let tenant_id = TenantId::new(Uuid::new_v4());

    match state.sond_service.export_form(&tenant_id, form_id).await {
        Ok(data) => (
            StatusCode::OK,
            [(axum::http::header::CONTENT_TYPE, "text/csv")],
            data,
        )
            .into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to export form").into_response(),
    }
}
