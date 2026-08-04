use axum::{extract::State, response::Json};
use chrono::Utc;

use crate::AppState;
use crate::middleware::AuthContext;
use crate::error::{ApiResponseError, ApiResult};
use ataqu_contracts::cinq::TrackEmailRequest;

#[derive(Debug, serde::Serialize)]
pub struct TrackEmailResponse {
    pub id: i64,
    pub status: String,
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
        Ok(()) => {
            Ok(Json(TrackEmailResponse {
                id: 0,
                status: "accepted".to_string(),
            }))
        }
        Err(tokio::sync::mpsc::error::TrySendError::Full(_)) => {
            Err(ApiResponseError::RateLimited)
        }
        Err(tokio::sync::mpsc::error::TrySendError::Closed(_)) => {
            Err(ApiResponseError::internal("Email tracking service unavailable"))
        }
    }
}
