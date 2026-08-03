//! CINQ API handlers - using ataqu_application::cinq_service.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
};
use uuid::Uuid;

use ataqu_application::cinq_service::{CreateContactCommand, CreateDealCommand};
use ataqu_contracts::cinq::*;
use ataqu_kernel::TenantId;
use ataqu_security::{Email, PhoneNumber};
use ataqu_domain_cinq::deal::DealStatus;
use crate::AppState;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Service error: {0}")]
    Service(String),
    #[error("Not found")]
    NotFound,
    #[error("Validation: {0}")]
    Validation(String),
}
impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let status = match self {
            ApiError::Service(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::NotFound => StatusCode::NOT_FOUND,
            ApiError::Validation(_) => StatusCode::BAD_REQUEST,
        };
        (status, self.to_string()).into_response()
    }
}
impl From<ataqu_application::cinq_service::CinqServiceError> for ApiError {
    fn from(e: ataqu_application::cinq_service::CinqServiceError) -> Self {
        match e {
            ataqu_application::cinq_service::CinqServiceError::ContactNotFound => ApiError::NotFound,
            ataqu_application::cinq_service::CinqServiceError::DealNotFound => ApiError::NotFound,
            ataqu_application::cinq_service::CinqServiceError::Validation(msg) => ApiError::Validation(msg),
            ataqu_application::cinq_service::CinqServiceError::Domain(err) => ApiError::Service(err.to_string()),
        }
    }
}

pub async fn create_contact(
    State(state): State<AppState>,
    Json(payload): Json<CreateContactRequest>,
) -> Result<Json<ContactResponse>, ApiError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = CreateContactCommand {
        tenant_id,
        name: payload.name,
        email: Email::new(payload.email),
        phone: payload.phone.map(PhoneNumber::new),
    };
    let contact = state.cinq_service.create_contact(cmd).await?;
    Ok(Json(ContactResponse {
        id: contact.id,
        name: contact.name,
        email: contact.email.to_string(),
    }))
}

pub async fn list_contacts(
    State(state): State<AppState>,
) -> Result<Json<Vec<ContactResponse>>, ApiError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let contacts = state.cinq_service.list_contacts(tenant_id).await?;
    Ok(Json(contacts.into_iter().map(|c| ContactResponse {
        id: c.id,
        name: c.name,
        email: c.email.to_string(),
    }).collect()))
}

pub async fn get_contact(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ContactResponse>, ApiError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let contact = state.cinq_service.get_contact(tenant_id, id).await?;
    Ok(Json(ContactResponse {
        id: contact.id,
        name: contact.name,
        email: contact.email.to_string(),
    }))
}

pub async fn create_deal(
    State(state): State<AppState>,
    Json(payload): Json<CreateDealRequest>,
) -> Result<Json<DealResponse>, ApiError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    // Use a default pipeline stage ID; in production this would come from the request or tenant config.
    let default_stage = Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .unwrap_or_else(|_| Uuid::new_v4());
    let cmd = CreateDealCommand {
        tenant_id,
        contact_id: payload.contact_id,
        title: payload.title,
        amount: payload.amount,
        pipeline_stage_id: default_stage,
        status: DealStatus::Open,
    };
    let deal = state.cinq_service.create_deal(cmd).await?;
    Ok(Json(DealResponse {
        id: deal.id,
        title: deal.title,
        amount: deal.amount,
    }))
}

pub async fn list_deals(
    State(state): State<AppState>,
) -> Result<Json<Vec<DealResponse>>, ApiError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let deals = state.cinq_service.list_deals(tenant_id).await?;
    Ok(Json(deals.into_iter().map(|d| DealResponse {
        id: d.id,
        title: d.title,
        amount: d.amount,
    }).collect()))
}

// Stubs for other endpoints
pub async fn list_pipeline_stages() -> Result<Json<Vec<PipelineStageResponse>>, ApiError> {
    Ok(Json(vec![]))
}
pub async fn create_pipeline_stage(Json(_payload): Json<CreatePipelineStageRequest>) -> Result<Json<PipelineStageResponse>, ApiError> {
    Ok(Json(PipelineStageResponse { id: Uuid::new_v4(), name: "stage".into(), order: 0 }))
}
pub async fn update_pipeline_stage(Path(_id): Path<Uuid>, Json(_payload): Json<UpdatePipelineStageRequest>) -> Result<Json<PipelineStageResponse>, ApiError> {
    Ok(Json(PipelineStageResponse { id: Uuid::new_v4(), name: "stage".into(), order: 0 }))
}
pub async fn delete_pipeline_stage(Path(_id): Path<Uuid>) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::NO_CONTENT)
}
pub async fn create_activity(Json(_payload): Json<CreateActivityRequest>) -> Result<Json<ActivityResponse>, ApiError> {
    Ok(Json(ActivityResponse { id: Uuid::new_v4(), description: "activity".into() }))
}
pub async fn list_activities(Query(_params): Query<ListActivitiesParams>) -> Result<Json<Vec<ActivityResponse>>, ApiError> {
    Ok(Json(vec![]))
}
pub async fn get_activity(Path(_id): Path<Uuid>) -> Result<Json<ActivityResponse>, ApiError> {
    Ok(Json(ActivityResponse { id: Uuid::new_v4(), description: "activity".into() }))
}
pub async fn search_contacts(Query(_params): Query<SearchParams>) -> Result<Json<Vec<ContactResponse>>, ApiError> {
    Ok(Json(vec![]))
}
pub async fn import_csv() -> Result<Json<ImportCsvResult>, ApiError> {
    Ok(Json(ImportCsvResult { imported: 0, failed: 0 }))
}
pub async fn export_csv() -> Result<impl IntoResponse, ApiError> {
    Ok((StatusCode::OK, "csv data"))
}
pub async fn track_email(Json(_payload): Json<TrackEmailRequest>) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::ACCEPTED)
}

pub fn cinq_routes() -> Router<AppState> {
    Router::new()
        .route("/contacts", axum::routing::post(create_contact))
        .route("/contacts", axum::routing::get(list_contacts))
        .route("/contacts/:id", axum::routing::get(get_contact))
        .route("/deals", axum::routing::post(create_deal))
        .route("/deals", axum::routing::get(list_deals))
        .route("/pipeline/stages", axum::routing::get(list_pipeline_stages))
        .route("/pipeline/stages", axum::routing::post(create_pipeline_stage))
        .route("/pipeline/stages/:id", axum::routing::put(update_pipeline_stage))
        .route("/pipeline/stages/:id", axum::routing::delete(delete_pipeline_stage))
        .route("/activities", axum::routing::post(create_activity))
        .route("/activities", axum::routing::get(list_activities))
        .route("/activities/:id", axum::routing::get(get_activity))
        .route("/search", axum::routing::get(search_contacts))
        .route("/csv/import", axum::routing::post(import_csv))
        .route("/csv/export", axum::routing::get(export_csv))
        .route("/email/track", axum::routing::post(track_email))
}
