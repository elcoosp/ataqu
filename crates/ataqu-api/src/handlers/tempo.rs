use axum::{
    Router,
    extract::{FromRequestParts, Path, Query, State},
    http::{StatusCode, request::Parts},
    response::Json,
    routing::get,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Extracts the `Idempotency-Key` header from the request.
#[derive(Debug, Clone)]
pub struct IdempotencyKey(pub String);

impl<S> FromRequestParts<S> for IdempotencyKey
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let key = parts
            .headers
            .get("Idempotency-Key")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .ok_or((StatusCode::BAD_REQUEST, "Missing Idempotency-Key header"))?;

        if key.trim().is_empty() {
            return Err((StatusCode::BAD_REQUEST, "Idempotency-Key header is empty"));
        }

        Ok(IdempotencyKey(key))
    }
}

#[derive(Debug, Clone)]
pub struct AppState {
    // Placeholder for application services
    // pub tempo_service: ataqu_application::tempo_service::TempoService,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/calendars", get(list_calendars).post(create_calendar))
        .route("/calendars/:calendar_id", get(get_calendar))
        .route(
            "/calendars/:calendar_id/availability",
            get(get_availability),
        )
        .route("/bookings", get(list_bookings).post(create_booking))
        .route("/bookings/:booking_id", get(get_booking))
        .route("/no-shows", get(list_no_shows))
}

// --- Request / Response Types ---

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCalendarRequest {
    pub name: String,
    pub timezone: String,
}

#[derive(Debug, Serialize)]
pub struct CalendarResponse {
    pub id: Uuid,
    pub name: String,
    pub timezone: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetAvailabilityRequest {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Serialize)]
pub struct AvailabilityResponse {
    pub slots: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBookingRequest {
    pub calendar_id: Uuid,
    pub start: String,
    pub end: String,
    pub attendee_email: String,
}

#[derive(Debug, Serialize)]
pub struct BookingResponse {
    pub id: Uuid,
    pub calendar_id: Uuid,
    pub start: String,
    pub end: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct NoShowResponse {
    pub booking_id: Uuid,
    pub detected_at: String,
}

// --- Handlers ---

pub async fn list_calendars(State(_state): State<AppState>) -> Json<Vec<CalendarResponse>> {
    // TODO: integrate with ataqu_application::tempo_service
    Json(vec![])
}

pub async fn create_calendar(
    State(_state): State<AppState>,
    IdempotencyKey(_key): IdempotencyKey,
    Json(payload): Json<CreateCalendarRequest>,
) -> Result<Json<CalendarResponse>, StatusCode> {
    // TODO: integrate with ataqu_application::tempo_service
    Ok(Json(CalendarResponse {
        id: Uuid::new_v4(),
        name: payload.name,
        timezone: payload.timezone,
    }))
}

pub async fn get_calendar(
    State(_state): State<AppState>,
    Path(calendar_id): Path<Uuid>,
) -> Result<Json<CalendarResponse>, StatusCode> {
    Ok(Json(CalendarResponse {
        id: calendar_id,
        name: "Main Calendar".to_string(),
        timezone: "UTC".to_string(),
    }))
}

pub async fn get_availability(
    State(_state): State<AppState>,
    Path(_calendar_id): Path<Uuid>,
    Query(params): Query<GetAvailabilityRequest>,
) -> Result<Json<AvailabilityResponse>, StatusCode> {
    Ok(Json(AvailabilityResponse {
        slots: vec![format!("{} to {}", params.start, params.end)],
    }))
}

pub async fn list_bookings(State(_state): State<AppState>) -> Json<Vec<BookingResponse>> {
    Json(vec![])
}

pub async fn create_booking(
    State(_state): State<AppState>,
    IdempotencyKey(_key): IdempotencyKey,
    Json(payload): Json<CreateBookingRequest>,
) -> Result<Json<BookingResponse>, StatusCode> {
    Ok(Json(BookingResponse {
        id: Uuid::new_v4(),
        calendar_id: payload.calendar_id,
        start: payload.start,
        end: payload.end,
        status: "confirmed".to_string(),
    }))
}

pub async fn get_booking(
    State(_state): State<AppState>,
    Path(booking_id): Path<Uuid>,
) -> Result<Json<BookingResponse>, StatusCode> {
    Ok(Json(BookingResponse {
        id: booking_id,
        calendar_id: Uuid::new_v4(),
        start: "2026-08-03T10:00:00Z".to_string(),
        end: "2026-08-03T11:00:00Z".to_string(),
        status: "confirmed".to_string(),
    }))
}

pub async fn list_no_shows(State(_state): State<AppState>) -> Json<Vec<NoShowResponse>> {
    Json(vec![])
}
