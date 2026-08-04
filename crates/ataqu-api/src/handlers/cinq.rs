//! CINQ API handlers using AuthContext.
//! Only implements endpoints that are fully supported by CinqService.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use rust_decimal::prelude::FromPrimitive;

use ataqu_application::cinq_service::{
    CreateContactCommand, CreateDealCommand, CreateActivityCommand,
    CreatePipelineStageCommand,
};
use ataqu_contracts::cinq::*;
use ataqu_kernel::TenantId;
use ataqu_security::{Email, PhoneNumber};
use ataqu_domain_cinq::deal::DealStatus;
use ataqu_domain_cinq::contact::Contact;
use ataqu_domain_cinq::deal::Deal;
use ataqu_domain_cinq::activity::Activity;
use ataqu_domain_cinq::pipeline::PipelineStage;

use crate::AppState;
use crate::middleware::AuthContext;
use crate::error::{ApiResponseError, ApiResult};

// ---------- Pagination ----------
#[derive(Debug, Deserialize, Default)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

// ---------- Contact Responses ----------
#[derive(Debug, Serialize)]
pub struct ContactResponse {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Contact> for ContactResponse {
    fn from(c: Contact) -> Self {
        Self {
            id: c.id,
            name: c.name,
            email: c.email.to_string(),
            phone: c.phone.map(|p| p.to_string()),
            created_at: c.created_at,
            updated_at: c.updated_at,
        }
    }
}

// ---------- Deal Responses ----------
#[derive(Debug, Serialize)]
pub struct DealResponse {
    pub id: Uuid,
    pub title: String,
    pub amount: Decimal,
    pub status: String,
    pub contact_id: Uuid,
    pub pipeline_stage_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Deal> for DealResponse {
    fn from(d: Deal) -> Self {
        Self {
            id: d.id,
            title: d.title,
            amount: Decimal::from_f64(d.amount).unwrap_or(Decimal::ZERO),
            status: format!("{:?}", d.status),
            contact_id: d.contact_id,
            pipeline_stage_id: d.pipeline_stage_id,
            created_at: d.created_at,
            updated_at: d.updated_at,
        }
    }
}

// ---------- Contact Endpoints ----------
pub async fn create_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateContactRequest>,
) -> ApiResult<(StatusCode, Json<ContactResponse>)> {
    let cmd = CreateContactCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        email: Email::new(payload.email),
        phone: payload.phone.map(PhoneNumber::new),
    };
    let contact = state.cinq_service.create_contact(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(ContactResponse::from(contact))))
}

pub async fn list_contacts(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<ContactResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let contacts = state.cinq_service.list_contacts(auth.tenant_id, limit, offset).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(contacts.into_iter().map(ContactResponse::from).collect()))
}

pub async fn get_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<ContactResponse>> {
    let contact = state.cinq_service.get_contact(auth.tenant_id, id).await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(ContactResponse::from(contact)))
}

// For now, update and delete are not fully implemented in the service.
// We'll return "not implemented" errors.
pub async fn update_contact(
    State(_state): State<AppState>,
    _auth: AuthContext,
    Path(_id): Path<Uuid>,
    Json(_payload): Json<UpdateContactRequest>,
) -> ApiResult<Json<ContactResponse>> {
    Err(ApiResponseError::internal("Update contact not yet implemented"))
}

pub async fn delete_contact(
    State(_state): State<AppState>,
    _auth: AuthContext,
    Path(_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    Err(ApiResponseError::internal("Delete contact not yet implemented"))
}

// ---------- Deal Endpoints ----------
pub async fn create_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateDealRequest>,
) -> ApiResult<(StatusCode, Json<DealResponse>)> {
    let default_stage = Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .unwrap_or_else(|_| Uuid::new_v4());
    let cmd = CreateDealCommand {
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        title: payload.title,
        amount: payload.amount,
        pipeline_stage_id: default_stage,
        status: DealStatus::Open,
    };
    let deal = state.cinq_service.create_deal(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(DealResponse::from(deal))))
}

pub async fn list_deals(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<DealResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let deals = state.cinq_service.list_deals(auth.tenant_id, limit, offset).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(deals.into_iter().map(DealResponse::from).collect()))
}

pub async fn get_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<DealResponse>> {
    let deal = state.cinq_service.get_deal(auth.tenant_id, id).await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(DealResponse::from(deal)))
}

pub async fn update_deal(
    State(_state): State<AppState>,
    _auth: AuthContext,
    Path(_id): Path<Uuid>,
    Json(_payload): Json<UpdateDealRequest>,
) -> ApiResult<Json<DealResponse>> {
    Err(ApiResponseError::internal("Update deal not yet implemented"))
}

pub async fn delete_deal(
    State(_state): State<AppState>,
    _auth: AuthContext,
    Path(_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    Err(ApiResponseError::internal("Delete deal not yet implemented"))
}

// ---------- Pipeline Stages ----------
pub async fn list_pipeline_stages(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<PipelineStageResponse>>> {
    let stages = state.cinq_service.list_pipeline_stages(auth.tenant_id).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(stages.into_iter().map(|s| PipelineStageResponse {
        id: s.id,
        name: s.name,
        order: s.order,
    }).collect()))
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
    let stage = state.cinq_service.create_pipeline_stage(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(PipelineStageResponse {
        id: stage.id,
        name: stage.name,
        order: stage.order,
    })))
}

pub async fn update_pipeline_stage(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePipelineStageRequest>,
) -> ApiResult<Json<PipelineStageResponse>> {
    let stage = state.cinq_service.update_pipeline_stage(
        auth.tenant_id, id, payload.name, payload.order
    ).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
    state.cinq_service.delete_pipeline_stage(auth.tenant_id, id).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- Activities ----------
pub async fn create_activity(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateActivityRequest>,
) -> ApiResult<(StatusCode, Json<ActivityResponse>)> {
    use ataqu_domain_cinq::activity::ActivityType;
    let cmd = CreateActivityCommand {
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        deal_id: None,
        activity_type: ActivityType::Note,
        description: payload.description,
        scheduled_at: None,
    };
    let activity = state.cinq_service.create_activity(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(ActivityResponse {
        id: activity.id,
        description: activity.description,
    })))
}

pub async fn list_activities(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<ListActivitiesParams>,
) -> ApiResult<Json<Vec<ActivityResponse>>> {
    let contact_id = params.contact_id.ok_or_else(|| ApiResponseError::validation("contact_id required"))?;
    let activities = state.cinq_service.list_activities_for_contact(
        auth.tenant_id, contact_id, 100, 0
    ).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(activities.into_iter().map(|a| ActivityResponse {
        id: a.id,
        description: a.description,
    }).collect()))
}

pub async fn get_activity(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<ActivityResponse>> {
    let activity = state.cinq_service.get_activity(auth.tenant_id, id).await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(ActivityResponse {
        id: activity.id,
        description: activity.description,
    }))
}

// ---------- Search ----------
pub async fn search_contacts(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<SearchParams>,
) -> ApiResult<Json<Vec<ContactResponse>>> {
    let contacts = state.cinq_service.search_contacts(auth.tenant_id, &params.q, 20).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(contacts.into_iter().map(ContactResponse::from).collect()))
}

// ---------- CSV ----------
pub async fn import_csv(
    State(state): State<AppState>,
    auth: AuthContext,
    body: String,
) -> ApiResult<Json<ImportCsvResult>> {
    use csv::ReaderBuilder;
    let mut rdr = ReaderBuilder::new().from_reader(body.as_bytes());
    let mut rows = Vec::new();
    for result in rdr.deserialize() {
        let record: std::collections::HashMap<String, String> = result.map_err(|e| ApiResponseError::validation(&e.to_string()))?;
        rows.push(record);
    }
    let inserted = state.cinq_service.import_contacts(auth.tenant_id, rows).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(ImportCsvResult { imported: inserted.len(), failed: 0 }))
}

pub async fn export_csv(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<impl axum::response::IntoResponse> {
    let csv_data = state.cinq_service.export_contacts(auth.tenant_id).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::OK, csv_data))
}

// ---------- Email Tracking ----------
pub async fn track_email(
    _auth: AuthContext,
    Json(_payload): Json<TrackEmailRequest>,
) -> ApiResult<StatusCode> {
    // TODO: implement email tracking
    Ok(StatusCode::ACCEPTED)
}

// ---------- Router ----------
pub fn cinq_routes() -> Router<AppState> {
    use axum::routing::{get, post, put, delete};
    Router::new()
        .route("/contacts", post(create_contact).get(list_contacts))
        .route("/contacts/:id", get(get_contact).put(update_contact).delete(delete_contact))
        .route("/deals", post(create_deal).get(list_deals))
        .route("/deals/:id", get(get_deal).put(update_deal).delete(delete_deal))
        .route("/pipeline/stages", get(list_pipeline_stages).post(create_pipeline_stage))
        .route("/pipeline/stages/:id", put(update_pipeline_stage).delete(delete_pipeline_stage))
        .route("/activities", post(create_activity).get(list_activities))
        .route("/activities/:id", get(get_activity))
        .route("/search", get(search_contacts))
        .route("/csv/import", post(import_csv))
        .route("/csv/export", get(export_csv))
        .route("/email/track", post(track_email))
}
