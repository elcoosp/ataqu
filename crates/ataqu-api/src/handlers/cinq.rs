//! CINQ API handlers using AuthContext.
//! Only implements endpoints that are fully supported by CinqService.

use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use ataqu_application::cinq_service::{
    CreateActivityCommand, CreateContactCommand, CreateDealCommand, CreatePipelineStageCommand,
    UpdateContactCommand, UpdateDealCommand,
};
use ataqu_contracts::cinq::*;
use ataqu_domain_cinq::activity::ActivityType;
use ataqu_domain_cinq::contact::Contact;
use ataqu_domain_cinq::deal::{Deal, DealStatus};
use ataqu_security::{Email, PhoneNumber};

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use crate::serializers::{ApiEmail, ApiPhone};

fn default_search_limit() -> u64 {
    100
}

#[derive(Debug, Deserialize, Default)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct ContactResponse {
    pub id: Uuid,
    pub name: String,
    pub company: Option<String>,
    pub email: ApiEmail,
    pub phone: Option<ApiPhone>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Contact> for ContactResponse {
    fn from(c: Contact) -> Self {
        Self {
            id: c.id,
            name: c.name,
            company: c.company,
            email: ApiEmail(c.email),
            phone: c.phone.map(ApiPhone),
            created_at: c.created_at,
            updated_at: c.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct DealResponse {
    pub id: Uuid,
    pub title: String,
    pub amount: Decimal,
    pub status: String,
    pub contact_id: Uuid,
    pub pipeline_stage_id: Uuid,
    pub owner_id: Option<Uuid>,
    pub probability: Option<i32>,
    pub variant_id: Option<Uuid>,
    pub quantity: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Deal> for DealResponse {
    fn from(d: Deal) -> Self {
        Self {
            id: d.id,
            title: d.title,
            amount: d.amount,
            status: serde_json::to_string(&d.status)
                .unwrap_or_default()
                .trim_matches('"')
                .to_string(),
            contact_id: d.contact_id,
            pipeline_stage_id: d.pipeline_stage_id,
            owner_id: d.owner_id,
            probability: d.probability,
            variant_id: d.variant_id,
            quantity: d.quantity,
            created_at: d.created_at,
            updated_at: d.updated_at,
        }
    }
}

pub async fn create_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateContactRequest>,
) -> ApiResult<(StatusCode, axum::http::HeaderMap, Json<ContactResponse>)> {
    if !payload.email.contains('@') {
        return Err(ApiResponseError::validation("Invalid email format"));
    }
    let cmd = CreateContactCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        company: payload.company,
        email: Email::new(payload.email),
        phone: payload.phone.map(PhoneNumber::new),
        custom_fields: payload.custom_fields,
        lead_score: None,
    };
    let contact = state
        .cinq_service
        .create_contact(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", contact.version).parse().unwrap(),
    );
    Ok((
        StatusCode::CREATED,
        headers,
        Json(ContactResponse::from(contact)),
    ))
}

pub async fn list_contacts(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<ContactResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let (contacts, total) = state
        .cinq_service
        .list_contacts(auth.tenant_id, limit, offset)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;

    let items = contacts.into_iter().map(ContactResponse::from).collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
}

pub async fn get_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResult<impl axum::response::IntoResponse> {
    let contact = state
        .cinq_service
        .get_contact(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;

    let etag = format!("\"{}\"", contact.version);
    if let Some(if_none_match) = headers.get(axum::http::header::IF_NONE_MATCH)
        && if_none_match
            .to_str()
            .map(|s| s == etag.as_str())
            .unwrap_or(false)
        {
            let mut h = axum::http::HeaderMap::new();
            h.insert(axum::http::header::ETAG, etag.parse().unwrap());
            return Ok((
                StatusCode::NOT_MODIFIED,
                h,
                Json(ContactResponse::from(contact)),
            ));
        }

    let mut resp_headers = axum::http::HeaderMap::new();
    resp_headers.insert(axum::http::header::ETAG, etag.parse().unwrap());
    Ok((
        StatusCode::OK,
        resp_headers,
        Json(ContactResponse::from(contact)),
    ))
}

pub async fn update_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateContactRequest>,
) -> ApiResult<Json<ContactResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    if let Some(ref email) = payload.email
        && !email.contains('@') {
            return Err(ApiResponseError::validation("Invalid email format"));
        }
    let cmd = UpdateContactCommand {
        id,
        tenant_id: auth.tenant_id,
        name: payload.name,
        company: payload.company,
        email: payload.email.map(Email::new),
        phone: payload.phone.map(|p| p.map(PhoneNumber::new)),
        custom_fields: payload.custom_fields,
        lead_score: payload.lead_score,
        expected_version: if_match,
    };
    let contact = state
        .cinq_service
        .update_contact(cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::ContactNotFound => {
                ApiResponseError::not_found("Contact not found")
            }
            ataqu_application::cinq_service::CinqServiceError::Validation(msg)
                if msg.contains("Version mismatch") =>
            {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(Json(ContactResponse::from(contact)))
}

pub async fn delete_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .cinq_service
        .delete_contact(auth.tenant_id, id)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::ContactNotFound => {
                ApiResponseError::not_found("Contact not found")
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, serde::Deserialize)]
pub struct BulkDeleteContactsRequest {
    pub ids: Vec<Uuid>,
}

pub async fn bulk_delete_contacts(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<BulkDeleteContactsRequest>,
) -> ApiResult<StatusCode> {
    state
        .cinq_service
        .bulk_delete_contacts(auth.tenant_id, payload.ids)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateDealRequest>,
) -> ApiResult<(StatusCode, axum::http::HeaderMap, Json<DealResponse>)> {
    state
        .cinq_service
        .get_pipeline_stage(auth.tenant_id, payload.pipeline_stage_id)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::PipelineStageNotFound => {
                ApiResponseError::validation("Invalid pipeline_stage_id")
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;

    let cmd = CreateDealCommand {
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        title: payload.title,
        pipeline_stage_id: payload.pipeline_stage_id,
        amount: payload.amount,
        status: DealStatus::Open,
        owner_id: payload.owner_id,
        probability: payload.probability,
        variant_id: payload.variant_id,
        quantity: payload.quantity,
        establishment_id: payload.establishment_id,
    };
    let deal = state
        .cinq_service
        .create_deal(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", deal.version).parse().unwrap(),
    );
    Ok((StatusCode::CREATED, headers, Json(DealResponse::from(deal))))
}

pub async fn list_deals(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<DealResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let (deals, total) = state
        .cinq_service
        .list_deals(auth.tenant_id, limit, offset)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let items = deals.into_iter().map(DealResponse::from).collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
}

pub async fn get_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResult<impl axum::response::IntoResponse> {
    let deal = state
        .cinq_service
        .get_deal(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    let etag = format!("\"{}\"", deal.version);
    if let Some(if_none_match) = headers.get(axum::http::header::IF_NONE_MATCH)
        && if_none_match
            .to_str()
            .map(|s| s == etag.as_str())
            .unwrap_or(false)
        {
            let mut h = axum::http::HeaderMap::new();
            h.insert(axum::http::header::ETAG, etag.parse().unwrap());
            return Ok((StatusCode::NOT_MODIFIED, h, Json(DealResponse::from(deal))));
        }
    let mut resp_headers = axum::http::HeaderMap::new();
    resp_headers.insert(axum::http::header::ETAG, etag.parse().unwrap());
    Ok((StatusCode::OK, resp_headers, Json(DealResponse::from(deal))))
}

pub async fn update_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateDealRequest>,
) -> ApiResult<Json<DealResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    let status = if let Some(s) = payload.status {
        match s.to_lowercase().as_str() {
            "open" => Some(DealStatus::Open),
            "won" => Some(DealStatus::Won),
            "lost" => Some(DealStatus::Lost),
            _ => return Err(ApiResponseError::validation("Invalid deal status")),
        }
    } else {
        None
    };
    let cmd = UpdateDealCommand {
        id,
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        title: payload.title,
        pipeline_stage_id: payload.pipeline_stage_id,
        amount: payload.amount,
        status,
        owner_id: payload.owner_id,
        probability: payload.probability,
        variant_id: payload.variant_id,
        quantity: payload.quantity,
        expected_version: if_match,
    };
    let deal = state
        .cinq_service
        .update_deal(cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::DealNotFound => {
                ApiResponseError::not_found("Deal not found")
            }
            ataqu_application::cinq_service::CinqServiceError::Validation(msg)
                if msg.contains("Version mismatch") =>
            {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(Json(DealResponse::from(deal)))
}

pub async fn delete_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .cinq_service
        .delete_deal(auth.tenant_id, id)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::DealNotFound => {
                ApiResponseError::not_found("Deal not found")
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_pipeline_stages(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<PipelineStageResponse>>> {
    let stages = state
        .cinq_service
        .list_pipeline_stages(auth.tenant_id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(
        stages
            .into_iter()
            .map(|s| PipelineStageResponse {
                id: s.id,
                name: s.name,
                order: s.order,
            })
            .collect(),
    ))
}

pub async fn create_pipeline_stage(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreatePipelineStageRequest>,
) -> ApiResult<(StatusCode, Json<PipelineStageResponse>)> {
    let cmd = CreatePipelineStageCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        order: payload.order,
    };
    let stage = state
        .cinq_service
        .create_pipeline_stage(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok((
        StatusCode::CREATED,
        Json(PipelineStageResponse {
            id: stage.id,
            name: stage.name,
            order: stage.order,
        }),
    ))
}

pub async fn update_pipeline_stage(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdatePipelineStageRequest>,
) -> ApiResult<Json<PipelineStageResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;
    let stage = state
        .cinq_service
        .update_pipeline_stage(auth.tenant_id, id, payload.name, payload.order, if_match)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(PipelineStageResponse {
        id: stage.id,
        name: stage.name,
        order: stage.order,
    }))
}

pub async fn delete_pipeline_stage(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .cinq_service
        .delete_pipeline_stage(auth.tenant_id, id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_activity(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateActivityRequest>,
) -> ApiResult<(StatusCode, Json<ActivityResponse>)> {
    let activity_type = match payload.activity_type.to_lowercase().as_str() {
        "call" => ActivityType::Call,
        "email" => ActivityType::Email,
        "meeting" => ActivityType::Meeting,
        "task" => ActivityType::Task,
        "note" => ActivityType::Note,
        _ => return Err(ApiResponseError::validation("Invalid activity_type")),
    };
    let cmd = CreateActivityCommand {
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        deal_id: payload.deal_id,
        activity_type,
        description: payload.description,
        scheduled_at: payload.scheduled_at,
    };
    let activity = state
        .cinq_service
        .create_activity(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok((
        StatusCode::CREATED,
        Json(ActivityResponse {
            id: activity.id,
            activity_type: serde_json::to_string(&activity.activity_type)
                .unwrap_or_default()
                .trim_matches('"')
                .to_string(),
            description: activity.description,
            scheduled_at: activity.scheduled_at,
            contact_id: activity.contact_id,
            deal_id: activity.deal_id,
            created_at: activity.created_at,
        }),
    ))
}

pub async fn list_activities(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<ListActivitiesParams>,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<ActivityResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let (activities, total) = if let Some(contact_id) = params.contact_id {
        state
            .cinq_service
            .list_activities_for_contact(auth.tenant_id, contact_id, limit, offset)
            .await
            .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?
    } else {
        state
            .cinq_service
            .list_all_activities(auth.tenant_id, limit, offset)
            .await
            .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?
    };
    let items = activities
        .into_iter()
        .map(|a| ActivityResponse {
            id: a.id,
            activity_type: format!("{:?}", a.activity_type).to_lowercase(),
            description: a.description,
            scheduled_at: a.scheduled_at,
            contact_id: a.contact_id,
            deal_id: a.deal_id,
            created_at: a.created_at,
        })
        .collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
}

pub async fn get_activity(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<ActivityResponse>> {
    let activity = state
        .cinq_service
        .get_activity(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(ActivityResponse {
        id: activity.id,
        activity_type: serde_json::to_string(&activity.activity_type)
            .unwrap_or_default()
            .trim_matches('"')
            .to_string(),
        description: activity.description,
        scheduled_at: activity.scheduled_at,
        contact_id: activity.contact_id,
        deal_id: activity.deal_id,
        created_at: activity.created_at,
    }))
}

pub async fn search_contacts(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<SearchParams>,
) -> ApiResult<Json<Vec<ContactResponse>>> {
    let contacts = state
        .cinq_service
        .search_contacts(auth.tenant_id, &params.q, params.limit.unwrap_or(20))
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(
        contacts.into_iter().map(ContactResponse::from).collect(),
    ))
}

#[derive(Debug, Deserialize)]
pub struct CustomFieldSearchParams {
    pub field: String,
    pub value: String,
}

pub async fn search_by_custom_field(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<CustomFieldSearchParams>,
) -> ApiResult<Json<Vec<ContactResponse>>> {
    let contacts = state
        .cinq_service
        .search_by_custom_field(
            auth.tenant_id,
            &params.field,
            serde_json::json!(params.value),
        )
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(
        contacts.into_iter().map(ContactResponse::from).collect(),
    ))
}

#[derive(Debug, Deserialize)]
pub struct CrossFieldSearchParams {
    pub q: String,
    #[serde(default = "default_search_limit")]
    pub limit: u64,
}

pub async fn search_custom_fields_cross(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<CrossFieldSearchParams>,
) -> ApiResult<Json<Vec<ContactResponse>>> {
    let rate_key = format!("tier3_search:{}", auth.tenant_id.as_uuid());
    if !state.rate_limiter.check(&rate_key) {
        return Err(ApiResponseError::RateLimited);
    }
    let limit = std::cmp::min(params.limit, 50);
    let contacts = state
        .cinq_service
        .search_custom_fields_cross(auth.tenant_id, &params.q, limit)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(
        contacts.into_iter().map(ContactResponse::from).collect(),
    ))
}

#[derive(Debug, serde::Serialize)]
pub struct ImportCsvResultDetailed {
    pub imported: usize,
    pub failed: usize,
    pub failed_rows: Vec<(usize, String)>,
}

pub async fn import_csv(
    State(state): State<AppState>,
    auth: AuthContext,
    headers: axum::http::HeaderMap,
    body: String,
) -> ApiResult<Json<ImportCsvResultDetailed>> {
    // Idempotency is handled by the global middleware, but we enforce the header here
    if headers.get("Idempotency-Key").is_none() {
        return Err(ApiResponseError::Validation(
            "Idempotency-Key header required".to_string(),
        ));
    }
    if body.len() > 5 * 1024 * 1024 {
        return Err(ApiResponseError::validation("CSV file too large (max 5MB)"));
    }
    use csv::ReaderBuilder;
    let mut rdr = ReaderBuilder::new().from_reader(body.as_bytes());
    let mut rows = Vec::new();
    let mut failed_rows = Vec::new();
    for (row_index, result) in (1..).zip(rdr.deserialize()) {
        match result {
            Ok(record) => rows.push(record),
            Err(e) => {
                failed_rows.push((row_index, format!("Parse error: {}", e)));
            }
        }
    }

    let (imported, service_failed) = state
        .cinq_service
        .import_contacts(auth.tenant_id, rows)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;

    Ok(Json(ImportCsvResultDetailed {
        imported,
        failed: service_failed + failed_rows.len(),
        failed_rows,
    }))
}

pub async fn export_csv(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<impl axum::response::IntoResponse> {
    let data = state
        .cinq_service
        .export_contacts(auth.tenant_id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;

    Ok((
        StatusCode::OK,
        [
            (axum::http::header::CONTENT_TYPE, "text/csv".to_string()),
            (
                axum::http::header::CONTENT_DISPOSITION,
                "attachment; filename=\"contacts.csv\"".to_string(),
            ),
        ],
        data,
    ))
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub contact_id: Option<Uuid>,
    pub deal_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
pub struct TaskResponse {
    pub id: Uuid,
    pub contact_id: Option<Uuid>,
    pub deal_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<ataqu_domain_cinq::task::Task> for TaskResponse {
    fn from(t: ataqu_domain_cinq::task::Task) -> Self {
        Self {
            id: t.id,
            contact_id: t.contact_id,
            deal_id: t.deal_id,
            assigned_to: t.assigned_to,
            title: t.title,
            description: t.description,
            due_date: t.due_date,
            status: serde_json::to_string(&t.status)
                .unwrap_or_default()
                .trim_matches('"')
                .to_string(),
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}

pub async fn create_task(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateTaskRequest>,
) -> ApiResult<(StatusCode, axum::http::HeaderMap, Json<TaskResponse>)> {
    let cmd = ataqu_domain_cinq::task::CreateTaskCommand {
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        deal_id: payload.deal_id,
        assigned_to: payload.assigned_to,
        title: payload.title,
        description: payload.description,
        due_date: payload.due_date,
    };
    let task = state
        .cinq_service
        .create_task(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", task.version).parse().unwrap(),
    );
    Ok((StatusCode::CREATED, headers, Json(task.into())))
}

pub async fn list_tasks(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<TaskResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let tasks = state
        .cinq_service
        .list_tasks(auth.tenant_id, limit, offset)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(tasks.into_iter().map(TaskResponse::from).collect()))
}

pub async fn get_task(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResult<impl axum::response::IntoResponse> {
    let task = state
        .cinq_service
        .get_task(auth.tenant_id, id)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::TaskNotFound => {
                ApiResponseError::not_found("Task not found")
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    let etag = format!("\"{}\"", task.version);
    if let Some(if_none_match) = headers.get(axum::http::header::IF_NONE_MATCH)
        && if_none_match
            .to_str()
            .map(|s| s == etag.as_str())
            .unwrap_or(false)
        {
            let mut h = axum::http::HeaderMap::new();
            h.insert(axum::http::header::ETAG, etag.parse().unwrap());
            return Ok((StatusCode::NOT_MODIFIED, h, Json(TaskResponse::from(task))));
        }
    let mut resp_headers = axum::http::HeaderMap::new();
    resp_headers.insert(axum::http::header::ETAG, etag.parse().unwrap());
    Ok((StatusCode::OK, resp_headers, Json(TaskResponse::from(task))))
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: Option<String>,
}

pub async fn update_task(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateTaskRequest>,
) -> ApiResult<Json<TaskResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    let status = if let Some(s) = payload.status {
        Some(match s.to_lowercase().as_str() {
            "pending" => ataqu_domain_cinq::task::TaskStatus::Pending,
            "completed" => ataqu_domain_cinq::task::TaskStatus::Completed,
            "cancelled" => ataqu_domain_cinq::task::TaskStatus::Cancelled,
            _ => return Err(ApiResponseError::validation("Invalid task status")),
        })
    } else {
        None
    };
    let cmd = ataqu_domain_cinq::task::UpdateTaskCommand {
        id,
        tenant_id: auth.tenant_id,
        title: payload.title,
        description: payload.description,
        due_date: payload.due_date,
        status,
        expected_version: if_match,
    };
    let task = state
        .cinq_service
        .update_task(cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::TaskNotFound => {
                ApiResponseError::not_found("Task not found")
            }
            ataqu_application::cinq_service::CinqServiceError::Validation(msg)
                if msg.contains("Version mismatch") =>
            {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(Json(task.into()))
}

pub async fn delete_task(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .cinq_service
        .delete_task(auth.tenant_id, id)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::TaskNotFound => {
                ApiResponseError::not_found("Task not found")
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_contact_tasks(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<TaskResponse>>> {
    let tasks = state
        .cinq_service
        .list_tasks_for_contact(
            auth.tenant_id,
            id,
            params.limit.unwrap_or(100),
            params.offset.unwrap_or(0),
        )
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(tasks.into_iter().map(TaskResponse::from).collect()))
}

pub async fn track_email(
    state: State<AppState>,
    auth: AuthContext,
    Json(payload): Json<TrackEmailRequest>,
) -> ApiResult<Json<super::email_tracking::TrackEmailResponse>> {
    super::email_tracking::track_email(state, auth, Json(payload)).await
}

pub fn public_routes() -> Router<AppState> {
    Router::new().route(
        "/email/track/public",
        axum::routing::get(super::email_tracking::track_email_public),
    )
}

pub fn routes() -> Router<AppState> {
    use axum::routing::{get, post, put};
    Router::new()
        .route("/contacts", post(create_contact).get(list_contacts))
        .route(
            "/contacts/:id",
            get(get_contact).put(update_contact).delete(delete_contact),
        )
        .route("/contacts/bulk-delete", post(bulk_delete_contacts))
        .route("/deals", post(create_deal).get(list_deals))
        .route(
            "/deals/:id",
            get(get_deal).put(update_deal).delete(delete_deal),
        )
        .route(
            "/pipeline/stages",
            get(list_pipeline_stages).post(create_pipeline_stage),
        )
        .route(
            "/pipeline/stages/:id",
            put(update_pipeline_stage).delete(delete_pipeline_stage),
        )
        .route("/activities", post(create_activity).get(list_activities))
        .route("/activities/:id", get(get_activity))
        .route("/tasks", post(create_task).get(list_tasks))
        .route(
            "/tasks/:id",
            get(get_task).put(update_task).delete(delete_task),
        )
        .route("/contacts/:id/tasks", get(list_contact_tasks))
        .route("/search", get(search_contacts))
        .route("/search/custom", get(search_by_custom_field))
        .route("/search/custom/cross", get(search_custom_fields_cross))
        .route("/csv/import", post(import_csv))
        .route("/csv/export", get(export_csv))
        .route("/email/track", post(track_email))
}
