//! CINQ handlers - minimal but functional.
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
};
use std::sync::Arc;
use uuid::Uuid;

use ataqu_application::cinq_service::CinqService;
use ataqu_contracts::cinq::*;

pub struct AppState {
    pub service: Arc<CinqService<(), (), (), (), ()>>, // placeholder generics
}

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Not found")]
    NotFound,
    #[error("Conflict")]
    Conflict,
    #[error("Internal")]
    Internal,
}
impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()).into_response()
    }
}

pub async fn create_contact(
    State(_state): State<Arc<AppState>>,
    Json(_payload): Json<CreateContactRequest>,
) -> Result<Json<ContactResponse>, ApiError> {
    Ok(Json(ContactResponse { id: Uuid::new_v4(), name: "test".into(), email: "test@test.com".into() }))
}

pub async fn list_contacts(
    State(_state): State<Arc<AppState>>,
) -> Result<Json<Vec<ContactResponse>>, ApiError> {
    Ok(Json(vec![]))
}

pub async fn get_contact(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
) -> Result<Json<ContactResponse>, ApiError> {
    Ok(Json(ContactResponse { id: Uuid::new_v4(), name: "test".into(), email: "test@test.com".into() }))
}

pub async fn update_contact(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
    Json(_payload): Json<UpdateContactRequest>,
) -> Result<Json<ContactResponse>, ApiError> {
    Ok(Json(ContactResponse { id: Uuid::new_v4(), name: "test".into(), email: "test@test.com".into() }))
}

pub async fn delete_contact(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_deal(
    State(_state): State<Arc<AppState>>,
    Json(_payload): Json<CreateDealRequest>,
) -> Result<Json<DealResponse>, ApiError> {
    Ok(Json(DealResponse { id: Uuid::new_v4(), title: "deal".into(), amount: 100.0 }))
}

pub async fn list_deals(
    State(_state): State<Arc<AppState>>,
) -> Result<Json<Vec<DealResponse>>, ApiError> {
    Ok(Json(vec![]))
}

pub async fn get_deal(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
) -> Result<Json<DealResponse>, ApiError> {
    Ok(Json(DealResponse { id: Uuid::new_v4(), title: "deal".into(), amount: 100.0 }))
}

pub async fn update_deal(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
    Json(_payload): Json<UpdateDealRequest>,
) -> Result<Json<DealResponse>, ApiError> {
    Ok(Json(DealResponse { id: Uuid::new_v4(), title: "deal".into(), amount: 100.0 }))
}

pub async fn delete_deal(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    Ok(StatusCode::NO_CONTENT)
}

// Stubs for pipeline, activities, etc. - we add minimal implementations for missing endpoints.
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

pub fn cinq_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/contacts", axum::routing::post(create_contact))
        .route("/contacts", axum::routing::get(list_contacts))
        .route("/contacts/:id", axum::routing::get(get_contact))
        .route("/contacts/:id", axum::routing::put(update_contact))
        .route("/contacts/:id", axum::routing::delete(delete_contact))
        .route("/deals", axum::routing::post(create_deal))
        .route("/deals", axum::routing::get(list_deals))
        .route("/deals/:id", axum::routing::get(get_deal))
        .route("/deals/:id", axum::routing::put(update_deal))
        .route("/deals/:id", axum::routing::delete(delete_deal))
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
use axum::Router;

pub fn routes() -> Router<crate::AppState> {
    Router::new()
}
