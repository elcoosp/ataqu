use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use ataqu_application::sond_service::{SondService, CreateFormCommand, SubmitResponseCommand, Form, Response};
use ataqu_domain_sond::question::QuestionInput;
use ataqu_kernel::TenantId;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateFormRequest {
    pub title: String,
    pub description: Option<String>,
    pub questions: Vec<QuestionInput>,
}

#[derive(Debug, Serialize)]
pub struct FormResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub questions: Vec<Value>, // simplified
    pub created_at: chrono::DateTime<chrono::Utc>,
}
impl From<Form> for FormResponse {
    fn from(f: Form) -> Self {
        // Convert questions to Value (simplified)
        let questions = f.questions.iter().map(|q| serde_json::json!({
            "id": q.id,
            "label": q.label,
            "type": q.question_type,
            "required": q.required,
        })).collect();
        Self {
            id: f.id,
            title: f.title,
            description: f.description,
            questions,
            created_at: f.created_at,
        }
    }
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
        questions: payload.questions,
    };
    let form = state.sond_service.create_form(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(form.into())))
}

pub async fn list_forms(
    State(_state): State<AppState>,
) -> Result<Json<Vec<FormResponse>>, StatusCode> {
    // TODO: implement list_forms in service
    Ok(Json(vec![]))
}

pub async fn get_form(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<FormResponse>, StatusCode> {
    let form = state.sond_service.get_form(id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(form.into()))
}

#[derive(Debug, Deserialize)]
pub struct SubmitRequest {
    pub answers: Vec<ataqu_domain_sond::response::AnswerInput>,
    pub respondent_id: Option<Uuid>,
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
        answers: payload.answers,
        respondent_id: payload.respondent_id,
    };
    state.sond_service.submit_response(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(StatusCode::CREATED)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/forms", axum::routing::post(create_form))
        .route("/forms", axum::routing::get(list_forms))
        .route("/forms/:id", axum::routing::get(get_form))
        .route("/forms/:id/submit", axum::routing::post(submit_form))
}
