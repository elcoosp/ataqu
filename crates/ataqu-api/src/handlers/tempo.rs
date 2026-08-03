use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

use ataqu_application::tempo_service::{CreateBookingCommand, Booking};
use ataqu_kernel::TenantId;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateBookingRequest {
    pub event_type: String,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
}

#[derive(Debug, Serialize)]
pub struct BookingResponse {
    pub id: Uuid,
    pub event_type: String,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
    pub status: String,
    pub created_at: DateTime<Utc>,
}
impl From<Booking> for BookingResponse {
    fn from(b: Booking) -> Self {
        Self {
            id: b.id,
            event_type: b.event_type,
            starts_at: b.starts_at,
            duration_minutes: b.duration_minutes,
            status: b.status,
            created_at: b.created_at,
        }
    }
}

pub async fn create_booking(
    State(state): State<AppState>,
    Json(payload): Json<CreateBookingRequest>,
) -> Result<(StatusCode, Json<BookingResponse>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = CreateBookingCommand {
        tenant_id,
        event_type: payload.event_type,
        starts_at: payload.starts_at,
        duration_minutes: payload.duration_minutes,
    };
    let booking = state.tempo_service.create_booking(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(booking.into())))
}

pub async fn list_bookings(
    State(state): State<AppState>,
) -> Result<Json<Vec<BookingResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let bookings = state.tempo_service.list_bookings(tenant_id).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(bookings.into_iter().map(|b| b.into()).collect()))
}

pub async fn get_booking(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<BookingResponse>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let booking = state.tempo_service.get_booking(tenant_id, id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(booking.into()))
}

pub async fn cancel_booking(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<BookingResponse>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let booking = state.tempo_service.cancel_booking(tenant_id, id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(booking.into()))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/bookings", axum::routing::post(create_booking))
        .route("/bookings", axum::routing::get(list_bookings))
        .route("/bookings/:id", axum::routing::get(get_booking))
        .route("/bookings/:id/cancel", axum::routing::post(cancel_booking))
}
