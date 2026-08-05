use axum::{extract::State, response::Json};
use chrono::Utc;
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_contracts::cinq::TrackEmailRequest;

#[derive(Debug, serde::Serialize)]
pub struct TrackEmailResponse {
    pub status: String,
}

pub async fn track_email_public(
    State(state): State<AppState>,
    Json(req): Json<TrackEmailRequest>,
) -> ApiResult<Json<TrackEmailResponse>> {
    match req.event_type.as_str() {
        "open" | "click" | "bounce" | "send" | "deliver" => {}
        _ => return Err(ApiResponseError::validation("Invalid event_type")),
    }

    let tenant_id = req
        .metadata
        .get("tenant_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let tracking_event = ataqu_infra_repositories::email_tracking_writer::TrackingEvent {
        tenant_id,
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
