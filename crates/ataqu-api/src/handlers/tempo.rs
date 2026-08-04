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
    BookingStatus, CreateBookingCommand, UpdateBookingStatusCommand,
};

#[derive(Debug, Deserialize)]
pub struct CreateBookingRequest {
    pub event_type_id: Uuid,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
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

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/bookings", axum::routing::post(create_booking))
        .route("/bookings", axum::routing::get(list_bookings))
        .route("/bookings/:id", axum::routing::get(get_booking))
        .route("/bookings/:id/cancel", axum::routing::post(cancel_booking))
}
