use axum::{
    extract::{Path, Query, State},
    response::Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_contracts::cinq::TrackEmailRequest;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize)]
pub struct TrackEmailResponse {
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct PublicTrackEmailRequest {
    pub contact_id: Uuid,
    pub event_type: String,
    pub tenant_id: Uuid,
    /// Unix deadline after which the signed tracking URL is invalid.
    pub expires: Option<i64>,
    /// HMAC-SHA256(`tenant_id|contact_id|event_type|expires`) keyed with the
    /// server's JWT secret.
    pub sig: Option<String>,
}

/// Compute the tracking-URL signature (exposed for tests and future email
/// producers — email templates embed `/api/cinq/email/track/public?...&sig=…`).
pub fn sign_tracking_params(
    secret: &[u8],
    tenant_id: &Uuid,
    contact_id: &Uuid,
    event_type: &str,
    expires: i64,
) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    let mut mac = Hmac::<Sha256>::new_from_slice(secret).expect("HMAC accepts any key length");
    mac.update(format!("{tenant_id}|{contact_id}|{event_type}|{expires}").as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

pub async fn track_email_public(
    State(state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<PublicTrackEmailRequest>,
) -> ApiResult<impl axum::response::IntoResponse> {
    // SECURITY (fixed in audit): this pixel was UNSIGNED — anyone could forge
    // open/click/bounce events for any contact, and the contact validation
    // leaked a contact-existence oracle (404 vs 200). The endpoint now
    // requires a valid HMAC signature and a non-expired deadline; invalid or
    // missing signatures still receive the 1x1 GIF (no oracle) but the event
    // is NOT recorded.
    let pixel = general_purpose::STANDARD
        .decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
        .unwrap();

    let valid = (|| {
        let expires = req.expires?;
        if expires < Utc::now().timestamp() {
            return None;
        }
        let sig = req.sig.as_deref()?;
        let expected = sign_tracking_params(
            &state.jwt_secret,
            &req.tenant_id,
            &req.contact_id,
            &req.event_type,
            expires,
        );
        // Constant-time comparison.
        if sig.len() != expected.len() {
            return None;
        }
        let mut diff = 0u8;
        for (a, b) in sig.bytes().zip(expected.bytes()) {
            diff |= a ^ b;
        }
        (diff == 0).then_some(())
    })()
    .is_some();

    if !valid {
        metrics::counter!("ataqu_email_tracking_unsigned_total").increment(1);
        return Ok((
            axum::http::StatusCode::OK,
            [(axum::http::header::CONTENT_TYPE, "image/gif")],
            pixel,
        ));
    }

    match req.event_type.as_str() {
        "open" | "click" | "bounce" | "send" | "deliver" => {}
        _ => return Err(ApiResponseError::validation("Invalid event_type")),
    }

    // Existence check removed from the anonymous path (oracle). The tracking
    // writer tolerates unknown contacts.

    // Rate limiting per contact (not per tenant — one attacker must not be
    // able to exhaust another tenant's whole budget).
    let rate_key = format!("email_track_pub:{}", req.contact_id);
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

#[derive(Debug, Deserialize)]
pub struct TrackingQueryParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
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

pub async fn get_contact_tracking(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(contact_id): Path<Uuid>,
    Query(params): Query<TrackingQueryParams>,
) -> ApiResult<Json<serde_json::Value>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let (events, total) = state
        .cinq_service
        .get_tracking_events_for_contact(auth.tenant_id, contact_id, limit, offset)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let resp = serde_json::json!({
        "items": events,
        "total": total,
        "limit": limit,
        "offset": offset,
    });
    Ok(Json(resp))
}
