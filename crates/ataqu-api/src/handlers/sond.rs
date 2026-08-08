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
    #[serde(default)]
    pub branding: serde_json::Value,
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
                let mut val =
                    serde_json::to_value(&q.question_type).unwrap_or(serde_json::Value::Null);
                if let Some(obj) = val.as_object_mut() {
                    obj.insert("id".into(), q.id.to_string().into());
                    obj.insert("label".into(), q.label.clone().into());
                    obj.insert("required".into(), q.required.into());
                    obj.insert(
                        "conditions".into(),
                        serde_json::to_value(&q.conditions).unwrap_or(serde_json::Value::Null),
                    );
                    obj.insert("page".into(), q.page.into());
                }
                val
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
) -> ApiResult<(StatusCode, axum::http::HeaderMap, Json<FormResponse>)> {
    let cmd = CreateFormCommand {
        tenant_id: auth.tenant_id,
        title: payload.title,
        description: payload.description,
        questions: payload.questions,
        branding: payload.branding,
    };
    let form = state
        .sond_service
        .create_form(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", form.version).parse().unwrap(),
    );
    Ok((StatusCode::CREATED, headers, Json(form.into())))
}

pub async fn list_forms(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<FormResponse>>> {
    let forms = state
        .sond_service
        .list_forms(
            auth.tenant_id,
            params.limit.unwrap_or(100),
            params.offset.unwrap_or(0),
        )
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(forms.into_iter().map(|f| f.into()).collect()))
}

pub async fn get_form(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResult<impl axum::response::IntoResponse> {
    let form = state
        .sond_service
        .get_form(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    let etag = format!("\"{}\"", form.version);
    if let Some(if_none_match) = headers.get(axum::http::header::IF_NONE_MATCH) {
        if if_none_match.to_str().map(|s| s == etag.as_str()).unwrap_or(false) {
            let mut h = axum::http::HeaderMap::new();
            h.insert(axum::http::header::ETAG, etag.parse().unwrap());
            return Ok((StatusCode::NOT_MODIFIED, h, Json(FormResponse::from(form))));
        }
    }
    let mut resp_headers = axum::http::HeaderMap::new();
    resp_headers.insert(axum::http::header::ETAG, etag.parse().unwrap());
    Ok((StatusCode::OK, resp_headers, Json(FormResponse::from(form))))
}

#[derive(Debug, Deserialize)]
pub struct UpdateFormRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub questions: Option<Vec<ataqu_domain_sond::question::QuestionInput>>,
}

pub async fn update_form(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateFormRequest>,
) -> ApiResult<Json<FormResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    let cmd = ataqu_domain_sond::form::UpdateFormCommand {
        form_id: id,
        title: payload.title,
        description: payload.description,
        questions: payload.questions,
        expected_version: if_match,
    };

    let updated_form = state
        .sond_service
        .update_form(auth.tenant_id, cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::sond_service::SondServiceError::FormNotFound => {
                ApiResponseError::not_found("Form not found")
            }
            ataqu_application::sond_service::SondServiceError::Validation(msg)
                if msg.contains("Version mismatch") =>
            {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(Json(updated_form.into()))
}

pub async fn delete_form(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .sond_service
        .delete_form(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct SubmitRequest {
    pub answers: Vec<AnswerInput>,
    pub respondent_id: Option<Uuid>,
}

pub async fn submit_form(
    State(state): State<AppState>,
    Path(form_id): Path<Uuid>,
    Json(payload): Json<SubmitRequest>,
) -> ApiResult<StatusCode> {
    // Rate limit public form submissions by form_id
    let rate_key = format!("sond_submit:{}", form_id);
    if !state.rate_limiter.check(&rate_key) {
        return Err(ApiResponseError::RateLimited);
    }
    let form = state
        .sond_service
        .get_form_public(form_id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    let cmd = SubmitResponseCommand {
        tenant_id: form.tenant_id,
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
    Ok((
        StatusCode::OK,
        [
            (axum::http::header::CONTENT_TYPE, "text/csv".to_string()),
            (
                axum::http::header::CONTENT_DISPOSITION,
                "attachment; filename=\"responses.csv\"".to_string(),
            ),
        ],
        data,
    ))
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

pub fn public_routes() -> Router<AppState> {
    Router::new().route("/forms/:id/submit", axum::routing::post(submit_form))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/forms", axum::routing::post(create_form).get(list_forms))
        .route(
            "/forms/:id",
            axum::routing::get(get_form)
                .put(update_form)
                .delete(delete_form),
        )
        .route("/forms/:id/export", axum::routing::get(export_responses))
}
