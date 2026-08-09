use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_application::tempo_service::{
    BookingStatus, CreateAvailabilitySlotCommand, CreateBookingCommand, CreateEventTypeCommand,
    UpdateBookingStatusCommand, UpdateEventTypeCommand,
};

#[derive(Debug, Deserialize)]
pub struct CreateBookingRequest {
    pub event_type_id: Uuid,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
    #[serde(default = "default_timezone")]
    pub timezone: String,
    pub contact_id: Option<Uuid>,
}

fn default_timezone() -> String {
    "UTC".to_string()
}

#[derive(Debug, Serialize)]
pub struct BookingResponse {
    pub id: Uuid,
    pub event_type_id: Uuid,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub version: i32,
}

impl From<ataqu_application::tempo_service::Booking> for BookingResponse {
    fn from(b: ataqu_application::tempo_service::Booking) -> Self {
        Self {
            id: b.id.0,
            event_type_id: b.event_type_id.0,
            starts_at: b.starts_at.into(),
            duration_minutes: b.duration_minutes,
            status: serde_json::to_string(&b.status)
                .unwrap_or_default()
                .trim_matches('"')
                .to_string(),
            created_at: b.created_at.into(),
            version: b.version,
        }
    }
}

pub async fn create_booking(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateBookingRequest>,
) -> ApiResult<(StatusCode, Json<BookingResponse>)> {
    let cmd = CreateBookingCommand {
        tenant_id: auth.tenant_id,
        event_type_id: payload.event_type_id,
        starts_at: payload.starts_at,
        duration_minutes: payload.duration_minutes,
        timezone: payload.timezone,
        contact_id: payload.contact_id,
    };
    let booking = state
        .tempo_service
        .create_booking(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok((StatusCode::CREATED, Json(booking.into())))
}

pub async fn list_bookings(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<BookingResponse>>> {
    let (bookings, total) = state
        .tempo_service
        .list_bookings(auth.tenant_id, 100, 0)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let items = bookings.into_iter().map(|b| b.into()).collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit: 100,
        offset: 0,
    }))
}

pub async fn get_booking(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<BookingResponse>> {
    let booking = state
        .tempo_service
        .get_booking(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(booking.into()))
}

pub async fn cancel_booking(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResult<Json<BookingResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;
    let cmd = UpdateBookingStatusCommand {
        tenant_id: auth.tenant_id,
        booking_id: id,
        status: BookingStatus::Cancelled,
        expected_version: if_match,
    };
    let booking = state
        .tempo_service
        .update_booking_status(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(booking.into()))
}

#[derive(Debug, Deserialize)]
pub struct RescheduleBookingRequest {
    pub starts_at: DateTime<Utc>,
}

pub async fn reschedule_booking(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<RescheduleBookingRequest>,
) -> ApiResult<Json<BookingResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;
    let booking = state
        .tempo_service
        .reschedule_booking(auth.tenant_id, id, payload.starts_at, if_match)
        .await
        .map_err(|e| match e {
            ataqu_application::tempo_service::TempoServiceError::Validation(msg) => {
                if msg.contains("Version mismatch") {
                    ApiResponseError::conflict(&msg)
                } else {
                    ApiResponseError::validation(&msg)
                }
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(Json(booking.into()))
}

pub async fn confirm_booking(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResult<Json<BookingResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;
    let cmd = UpdateBookingStatusCommand {
        tenant_id: auth.tenant_id,
        booking_id: id,
        status: BookingStatus::Confirmed,
        expected_version: if_match,
    };
    let booking = state
        .tempo_service
        .update_booking_status(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(booking.into()))
}

#[derive(Debug, Deserialize)]
pub struct CreateEventTypeRequest {
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub duration_minutes: i32,
}

#[derive(Debug, Serialize)]
pub struct EventTypeResponse {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub duration_minutes: i32,
    pub is_active: bool,
}

impl From<ataqu_application::tempo_service::EventType> for EventTypeResponse {
    fn from(e: ataqu_application::tempo_service::EventType) -> Self {
        Self {
            id: e.id.0,
            name: e.name,
            slug: e.slug,
            description: e.description,
            duration_minutes: e.duration_minutes,
            is_active: e.is_active,
        }
    }
}

pub async fn create_event_type(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateEventTypeRequest>,
) -> ApiResult<(StatusCode, Json<EventTypeResponse>)> {
    let cmd = CreateEventTypeCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        duration_minutes: payload.duration_minutes,
    };
    let event_type = state
        .tempo_service
        .create_event_type(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok((StatusCode::CREATED, Json(event_type.into())))
}

pub async fn list_event_types(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<EventTypeResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let (event_types, total) = state
        .tempo_service
        .list_event_types(auth.tenant_id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let items = event_types
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .map(|e| e.into())
        .collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateEventTypeRequest {
    pub name: Option<String>,
    pub slug: Option<String>,
    pub description: Option<Option<String>>,
    pub duration_minutes: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

pub async fn update_event_type(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateEventTypeRequest>,
) -> ApiResult<Json<EventTypeResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;
    let cmd = UpdateEventTypeCommand {
        tenant_id: auth.tenant_id,
        id,
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        duration_minutes: payload.duration_minutes,
        is_active: payload.is_active,
    };
    let event_type = state
        .tempo_service
        .update_event_type(cmd, if_match)
        .await
        .map_err(|e| match e {
            ataqu_application::tempo_service::TempoServiceError::EventTypeNotFound => {
                ApiResponseError::not_found("Event type not found")
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(Json(event_type.into()))
}

pub async fn delete_event_type(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .tempo_service
        .delete_event_type(auth.tenant_id, id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct CreateAvailabilitySlotRequest {
    pub event_type_id: Uuid,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct AvailabilitySlotResponse {
    pub id: Uuid,
    pub event_type_id: Uuid,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub is_booked: bool,
}

impl From<ataqu_domain_tempo::availability::AvailabilitySlot> for AvailabilitySlotResponse {
    fn from(s: ataqu_domain_tempo::availability::AvailabilitySlot) -> Self {
        Self {
            id: s.id,
            event_type_id: s.event_type_id,
            start_time: s.start_time,
            end_time: s.end_time,
            is_booked: s.is_booked,
        }
    }
}

pub async fn create_availability_slot(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateAvailabilitySlotRequest>,
) -> ApiResult<(StatusCode, Json<AvailabilitySlotResponse>)> {
    let cmd = CreateAvailabilitySlotCommand {
        tenant_id: auth.tenant_id,
        event_type_id: payload.event_type_id,
        start_time: payload.start_time,
        end_time: payload.end_time,
    };
    let slot = state
        .tempo_service
        .create_availability_slot(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok((StatusCode::CREATED, Json(slot.into())))
}

pub async fn list_availability_slots(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(event_type_id): Path<Uuid>,
) -> ApiResult<Json<Vec<AvailabilitySlotResponse>>> {
    let slots = state
        .tempo_service
        .list_availability_slots(auth.tenant_id, event_type_id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(slots.into_iter().map(|s| s.into()).collect()))
}

pub async fn delete_availability_slot(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(slot_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .tempo_service
        .delete_availability_slot(auth.tenant_id, slot_id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct PublicBookingRequest {
    pub slug: String,
    pub starts_at: chrono::DateTime<chrono::Utc>,
    #[serde(default = "default_timezone")]
    pub timezone: String,
    pub invitee_name: String,
    pub invitee_email: String,
}

#[derive(Debug, Serialize)]
pub struct PublicBookingResponse {
    pub id: Uuid,
    pub starts_at: DateTime<Utc>,
    pub status: String,
}

pub async fn public_create_booking(
    State(state): State<AppState>,
    Path(tenant_id): Path<Uuid>,
    Json(payload): Json<PublicBookingRequest>,
) -> ApiResult<(StatusCode, Json<PublicBookingResponse>)> {
    let booking = state
        .tempo_service
        .public_create_booking(
            ataqu_kernel::TenantId::new(tenant_id),
            payload.slug,
            payload.starts_at,
            payload.timezone,
            payload.invitee_name,
            payload.invitee_email,
        )
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok((
        StatusCode::CREATED,
        Json(PublicBookingResponse {
            id: booking.id.0,
            starts_at: booking.starts_at.into(),
            status: serde_json::to_string(&booking.status)
                .unwrap_or_default()
                .trim_matches('"')
                .to_string(),
        }),
    ))
}

pub async fn get_public_event_type(
    State(state): State<AppState>,
    Path((tenant_id, slug)): Path<(Uuid, String)>,
) -> ApiResult<Json<EventTypeResponse>> {
    let event_type = state
        .tempo_service
        .get_event_type_by_slug(ataqu_kernel::TenantId::new(tenant_id), slug)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(event_type.into()))
}

pub fn public_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/public/:tenant_id/event-types/:slug",
            axum::routing::get(get_public_event_type),
        )
        .route(
            "/public/:tenant_id/bookings",
            axum::routing::post(public_create_booking),
        )
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/bookings", axum::routing::post(create_booking))
        .route("/bookings", axum::routing::get(list_bookings))
        .route("/bookings/:id", axum::routing::get(get_booking))
        .route("/bookings/:id/cancel", axum::routing::post(cancel_booking))
        .route(
            "/bookings/:id/confirm",
            axum::routing::post(confirm_booking),
        )
        .route(
            "/bookings/:id/reschedule",
            axum::routing::post(reschedule_booking),
        )
        .route(
            "/event-types",
            axum::routing::post(create_event_type).get(list_event_types),
        )
        .route(
            "/event-types/:id",
            axum::routing::put(update_event_type).delete(delete_event_type),
        )
        .route(
            "/availability-slots",
            axum::routing::post(create_availability_slot),
        )
        .route(
            "/availability-slots/:event_type_id",
            axum::routing::get(list_availability_slots),
        )
        .route(
            "/availability-slots/:id",
            axum::routing::delete(delete_availability_slot),
        )
}
