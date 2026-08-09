use axum::{extract::State, response::Json};
use chrono::Utc;
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_contracts::cinq::TrackEmailRequest;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, serde::Serialize)]
pub struct TrackEmailResponse {
    pub status: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct PublicTrackEmailRequest {
    pub contact_id: Uuid,
    pub event_type: String,
    pub tenant_id: Uuid,
}

pub async fn track_email_public(
    State(state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<PublicTrackEmailRequest>,
) -> ApiResult<impl axum::response::IntoResponse> {
    match req.event_type.as_str() {
        "open" | "click" | "bounce" | "send" | "deliver" => {}
        _ => return Err(ApiResponseError::validation("Invalid event_type")),
    }

    // Basic rate limiting to prevent abuse
    let rate_key = format!("email_track_pub:{}", req.tenant_id);
    if !state.rate_limiter.check(&rate_key) {
        return Err(ApiResponseError::RateLimited);
    }

    let tracking_event = ataqu_infra_repositories::email_tracking_writer::TrackingEvent {
        tenant_id: req.tenant_id,
        contact_id: req.contact_id,
        event_type: req.event_type,
        metadata: serde_json::json!({}),
        occurred_at: Utc::now(),
    };

    let pixel = general_purpose::STANDARD
        .decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
        .unwrap();

    match state.email_tracking_tx.send(tracking_event).await {
        Ok(()) => Ok((
            axum::http::StatusCode::OK,
            [(axum::http::header::CONTENT_TYPE, "image/gif")],
            pixel,
        )),
        Err(e) => {
            metrics::counter!("ataqu_email_tracking_dropped_total").increment(1);
            tracing::error!("Failed to enqueue tracking event: {}", e);
            Ok((
                axum::http::StatusCode::OK,
                [(axum::http::header::CONTENT_TYPE, "image/gif")],
                pixel,
            ))
        }
    }
}

pub async fn track_email(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<TrackEmailRequest>,
) -> ApiResult<Json<TrackEmailResponse>> {
    match req.event_type.as_str() {
        "open" | "click" | "bounce" | "send" | "deliver" => {}
        _ => return Err(ApiResponseError::validation("Invalid event_type")),
    }

    let tracking_event = ataqu_infra_repositories::email_tracking_writer::TrackingEvent {
        tenant_id: auth.tenant_id.as_uuid(),
        contact_id: req.contact_id,
        event_type: req.event_type,
        metadata: req.metadata,
        occurred_at: Utc::now(),
    };

    match state.email_tracking_tx.send(tracking_event).await {
        Ok(()) => Ok(Json(TrackEmailResponse {
            status: "accepted".to_string(),
        })),
        Err(_) => Err(ApiResponseError::internal(
            "Email tracking service unavailable",
        )),
    }
}
