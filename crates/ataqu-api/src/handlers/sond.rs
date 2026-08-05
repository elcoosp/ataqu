use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_application::sond_service::{CreateFormCommand, SubmitResponseCommand};
use ataqu_domain_sond::question::QuestionInput;
use ataqu_domain_sond::response::AnswerInput;

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
    pub questions: Vec<Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<ataqu_application::sond_service::Form> for FormResponse {
    fn from(f: ataqu_application::sond_service::Form) -> Self {
        let questions = f
            .questions
            .iter()
            .map(|q| {
                serde_json::json!({
                    "id": q.id,
                    "label": q.label,
                    "type": q.question_type,
                    "required": q.required,
                })
            })
            .collect();
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
    auth: AuthContext,
    Json(payload): Json<CreateFormRequest>,
) -> ApiResult<(StatusCode, Json<FormResponse>)> {
    let cmd = CreateFormCommand {
        tenant_id: auth.tenant_id,
        title: payload.title,
        description: payload.description,
        questions: payload.questions,
    };
    let form = state
        .sond_service
        .create_form(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(form.into())))
}

pub async fn list_forms(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<FormResponse>>> {
    let forms = state
        .sond_service
        .list_forms(auth.tenant_id, params.limit.unwrap_or(100), params.offset.unwrap_or(0))
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(forms.into_iter().map(|f| f.into()).collect()))
}

pub async fn get_form(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<FormResponse>> {
    let form = state
        .sond_service
        .get_form(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(form.into()))
}

#[derive(Debug, Deserialize)]
pub struct SubmitRequest {
    pub answers: Vec<AnswerInput>,
    pub respondent_id: Option<Uuid>,
}

pub async fn submit_form(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(form_id): Path<Uuid>,
    Json(payload): Json<SubmitRequest>,
) -> ApiResult<StatusCode> {
    let cmd = SubmitResponseCommand {
        tenant_id: auth.tenant_id,
        form_id,
        answers: payload.answers,
        respondent_id: payload.respondent_id,
    };
    state
        .sond_service
        .submit_response(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::CREATED)
}

pub async fn export_responses(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(form_id): Path<Uuid>,
) -> ApiResult<impl axum::response::IntoResponse> {
    let responses = state
        .sond_service
        .list_responses(auth.tenant_id, form_id, 100000, 0)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    let mut wtr = csv::Writer::from_writer(vec![]);
    wtr.write_record(["response_id", "submitted_at", "answers"])
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    for r in responses {
        let answers_json = serde_json::to_string(&r.answers)
            .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
        wtr.write_record(&[r.id.to_string(), r.submitted_at.to_rfc3339(), answers_json])
            .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    }
    let data = String::from_utf8(
        wtr.into_inner()
            .map_err(|e| ApiResponseError::internal(&e.to_string()))?,
    )
    .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::OK, data))
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/forms", axum::routing::post(create_form).get(list_forms))
        .route("/forms/:id", axum::routing::get(get_form))
        .route("/forms/:id/submit", axum::routing::post(submit_form))
        .route("/forms/:id/export", axum::routing::get(export_responses))
}
