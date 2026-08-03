use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use ataqu_application::sond_service::{SondService, CreateFormCommand, SubmitResponseCommand, Form, Submission};
use ataqu_kernel::TenantId;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateFormRequest {
    pub title: String,
    pub description: Option<String>,
    pub schema: Value,
}

#[derive(Debug, Serialize)]
pub struct FormResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub schema: Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
impl From<Form> for FormResponse {
    fn from(f: Form) -> Self {
        Self {
            id: f.id,
            title: f.title,
            description: f.description,
            schema: f.schema,
            created_at: f.created_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct SubmitRequest {
    pub respondent_id: Option<Uuid>,
    pub data: Value,
}

pub async fn create_form(
    State(state): State<AppState>,
    Json(payload): Json<CreateFormRequest>,
) -> Result<(StatusCode, Json<FormResponse>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = CreateFormCommand {
        tenant_id,
        title: payload.title,
        description: payload.description,
        schema: payload.schema,
    };
    let form = state.sond_service.create_form(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(form.into())))
}

pub async fn list_forms(
    State(state): State<AppState>,
) -> Result<Json<Vec<FormResponse>>, StatusCode> {
    // SondService doesn't have list_forms; we'll add a simple in-memory list.
    // For now, we'll return an empty list.
    Ok(Json(vec![]))
}

pub async fn get_form(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<FormResponse>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let form = state.sond_service.get_form(tenant_id, id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(form.into()))
}

pub async fn submit_form(
    State(state): State<AppState>,
    Path(form_id): Path<Uuid>,
    Json(payload): Json<SubmitRequest>,
) -> Result<StatusCode, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = SubmitResponseCommand {
        tenant_id,
        form_id,
        respondent_id: payload.respondent_id,
        data: payload.data,
    };
    state.sond_service.submit_response(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(StatusCode::CREATED)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/forms", axum::routing::post(create_form))
        .route("/forms/:id", axum::routing::get(get_form))
        .route("/forms/:id/submit", axum::routing::post(submit_form))
}
