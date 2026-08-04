use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

use crate::AppState;
use crate::middleware::AuthContext;
use crate::error::{ApiResponseError, ApiResult};

#[derive(Debug, Deserialize)]
pub struct TrackEmailRequest {
    pub contact_id: Uuid,
    pub event_type: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct TrackEmailResponse {
    pub id: i64,
    pub status: String,
}

pub async fn track_email(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<TrackEmailRequest>,
) -> ApiResult<Json<TrackEmailResponse>> {
    // Use the email tracking writer from the state
    let tracking_event = ataqu_infra_repositories::email_tracking_writer::TrackingEvent {
        tenant_id: auth.tenant_id.as_uuid(),
        contact_id: req.contact_id,
        event_type: req.event_type,
        metadata: req.metadata,
        occurred_at: Utc::now(),
    };
    // TODO: Actually send to the writer channel (needs to be in AppState)
    // For now, we just return success
    Ok(Json(TrackEmailResponse {
        id: 0,
        status: "accepted".to_string(),
    }))
}
