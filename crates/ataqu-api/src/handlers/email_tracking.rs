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

// GET endpoint for pixel tracking. Returns a 1x1 transparent GIF.
pub async fn track_email_public(
    State(state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<TrackEmailRequest>,
) -> ApiResult<impl axum::response::IntoResponse> {
    match req.event_type.as_str() {
        "open" | "click" | "bounce" | "send" | "deliver" => {}
        _ => return Err(ApiResponseError::validation("Invalid event_type")),
    }

    let tenant_id = req
        .metadata
        .get("tenant_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| ApiResponseError::validation("tenant_id missing in metadata"))?;

    let tracking_event = ataqu_infra_repositories::email_tracking_writer::TrackingEvent {
        tenant_id,
        contact_id: req.contact_id,
        event_type: req.event_type,
        metadata: req.metadata,
        occurred_at: Utc::now(),
    };

    match state.email_tracking_tx.try_send(tracking_event) {
        Ok(()) => {
            // 1x1 transparent GIF
            let pixel = general_purpose::STANDARD
                .decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
                .unwrap();
            Ok((
                axum::http::StatusCode::OK,
                [(axum::http::header::CONTENT_TYPE, "image/gif")],
                pixel,
            ))
        }
        Err(_) => {
            metrics::counter!("ataqu_email_tracking_dropped_total").increment(1);
            // ADR-031: Spill to JSONL is handled by the writer on DB failure.
            // If the channel is full, we still return 200 to the email client to prevent broken images.
            let pixel = general_purpose::STANDARD
                .decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
                .unwrap();
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

    match state.email_tracking_tx.try_send(tracking_event) {
        Ok(()) => Ok(Json(TrackEmailResponse {
            status: "accepted".to_string(),
        })),
        Err(tokio::sync::mpsc::error::TrySendError::Full(_)) => Err(ApiResponseError::RateLimited),
        Err(tokio::sync::mpsc::error::TrySendError::Closed(_)) => Err(ApiResponseError::internal(
            "Email tracking service unavailable",
        )),
    }
}
