use axum::{
    Router,
    extract::{Path, State},
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
    UpdateBookingStatusCommand,
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
}

impl From<ataqu_application::tempo_service::Booking> for BookingResponse {
    fn from(b: ataqu_application::tempo_service::Booking) -> Self {
        Self {
            id: b.id.0,
            event_type_id: b.event_type_id.0,
            starts_at: b.starts_at.into(),
            duration_minutes: b.duration_minutes,
            status: format!("{:?}", b.status).to_lowercase(),
            created_at: Utc::now(),
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
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(booking.into())))
}

pub async fn list_bookings(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<BookingResponse>>> {
    let bookings = state
        .tempo_service
        .list_bookings(auth.tenant_id, 100, 0)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(bookings.into_iter().map(|b| b.into()).collect()))
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
) -> ApiResult<Json<BookingResponse>> {
    let cmd = UpdateBookingStatusCommand {
        tenant_id: auth.tenant_id,
        booking_id: id,
        status: BookingStatus::Cancelled,
    };
    let booking = state
        .tempo_service
        .update_booking_status(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(booking.into()))
}

pub async fn confirm_booking(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<BookingResponse>> {
    let cmd = UpdateBookingStatusCommand {
        tenant_id: auth.tenant_id,
        booking_id: id,
        status: BookingStatus::Confirmed,
    };
    let booking = state
        .tempo_service
        .update_booking_status(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(event_type.into())))
}

pub async fn list_event_types(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<EventTypeResponse>>> {
    let event_types = state
        .tempo_service
        .list_event_types(auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(event_types.into_iter().map(|e| e.into()).collect()))
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
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct PublicBookingRequest {
    pub slug: String,
    pub starts_at: chrono::DateTime<chrono::Utc>,
    #[serde(default = "default_timezone")]
    pub timezone: String,
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
        )
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((
        StatusCode::CREATED,
        Json(PublicBookingResponse {
            id: booking.id.0,
            starts_at: booking.starts_at.into(),
            status: format!("{:?}", booking.status).to_lowercase(),
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
            "/event-types",
            axum::routing::post(create_event_type).get(list_event_types),
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
        .route(
            "/public/:tenant_id/event-types/:slug",
            axum::routing::get(get_public_event_type),
        )
        .route(
            "/public/:tenant_id/bookings",
            axum::routing::post(public_create_booking),
        )
}
