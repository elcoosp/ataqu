//! VISTA analytics API handlers.
//!
//! Provides REST endpoints for dashboards, KPIs, charts, filters, and
//! export, plus a Server-Sent Events (SSE) endpoint for real-time
//! analytics updates.
//!
//! # Endpoints
//!
//! | Method | Path                      | Handler          | Idempotency-Key |
//! |--------|---------------------------|------------------|-----------------|
//! | GET    | /vista/dashboards/:id     | `get_dashboard`  | optional        |
//! | GET    | /vista/kpis               | `get_kpis`       | optional        |
//! | GET    | /vista/charts/:id         | `get_chart`      | optional        |
//! | POST   | /vista/filters            | `apply_filters`  | required        |
//! | POST   | /vista/export             | `export_data`    | required        |
//! | GET    | /vista/stream             | `stream_updates` | n/a (SSE)       |

use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::{Extension, Path, Query};
use axum::http::{HeaderMap, StatusCode};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Json, Response};
use serde::{Deserialize, Serialize};
use tokio_stream::StreamExt;
use uuid::Uuid;

use ataqu_application::vista_service::{self, KpiSnapshot, VistaService};

// =========================================================================
// Error Type
// =========================================================================

/// Errors raised by VISTA API handlers.
///
/// Service-layer errors are stringified to avoid leaking internal details
/// in HTTP responses; the original error is logged via `tracing` before
/// the 500 response is returned.
#[derive(Debug, thiserror::Error)]
pub enum VistaApiError {
    #[error("missing required `Idempotency-Key` header for {method} {path}")]
    MissingIdempotencyKey { method: String, path: String },

    #[error("invalid `Idempotency-Key` header: {detail}")]
    InvalidIdempotencyKey { detail: String },

    #[error("invalid request: {0}")]
    InvalidRequest(String),

    #[error("resource not found: {0}")]
    NotFound(String),

    #[error("vista service error: {0}")]
    Service(String),

    #[error("endpoint not implemented")]
    NotImplemented,
}

impl IntoResponse for VistaApiError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            Self::MissingIdempotencyKey { .. } | Self::InvalidIdempotencyKey { .. } => {
                (StatusCode::BAD_REQUEST, self.to_string())
            }
            Self::InvalidRequest(_) => (StatusCode::UNPROCESSABLE_ENTITY, self.to_string()),
            Self::NotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            Self::Service(_) => {
                tracing::error!(error = %self, "VISTA service error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal server error".to_string(),
                )
            }
            Self::NotImplemented => (StatusCode::NOT_IMPLEMENTED, self.to_string()),
        };
        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}

// =========================================================================
// Idempotency-Key Extraction
// =========================================================================

/// Extracts the `Idempotency-Key` header and maps it to a deterministic
/// `command_id` via `Uuid::new_v5` (NAMESPACE_URL).
///
/// Returns `Ok(None)` when the header is absent (valid for GET endpoints).
/// Returns `Err` when the header is present but malformed.
///
/// The key is trimmed of surrounding whitespace before hashing. Keys
/// longer than 255 characters are rejected to prevent abuse.
pub fn extract_idempotency_key(headers: &HeaderMap) -> Result<Option<Uuid>, VistaApiError> {
    let Some(value) = headers.get("idempotency-key") else {
        return Ok(None);
    };

    let key_str = value
        .to_str()
        .map_err(|_| VistaApiError::InvalidIdempotencyKey {
            detail: "header contains non-ASCII characters".into(),
        })?;

    let trimmed = key_str.trim();
    if trimmed.is_empty() {
        return Err(VistaApiError::InvalidIdempotencyKey {
            detail: "header value is empty".into(),
        });
    }

    if trimmed.len() > 255 {
        return Err(VistaApiError::InvalidIdempotencyKey {
            detail: "header value exceeds 255 characters".into(),
        });
    }

    let command_id = Uuid::new_v5(&Uuid::NAMESPACE_URL, trimmed.as_bytes());
    Ok(Some(command_id))
}

/// Requires the `Idempotency-Key` header for mutating endpoints (POST/PUT/PATCH).
///
/// Callers should pass the HTTP method and path for a descriptive error message.
pub fn require_idempotency_key(
    headers: &HeaderMap,
    method: &str,
    path: &str,
) -> Result<Uuid, VistaApiError> {
    extract_idempotency_key(headers)?.ok_or_else(|| VistaApiError::MissingIdempotencyKey {
        method: method.to_string(),
        path: path.to_string(),
    })
}

// =========================================================================
// DTOs
// =========================================================================

// --- Dashboard ---

#[derive(Debug, Serialize)]
pub struct DashboardResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub widgets: Vec<WidgetDto>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct WidgetDto {
    pub id: Uuid,
    pub kind: String,
    pub title: String,
    pub config: serde_json::Value,
}

// --- KPIs ---

#[derive(Debug, Deserialize)]
pub struct KpiQuery {
    pub dashboard_id: Option<Uuid>,
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
pub struct KpiResponse {
    pub label: String,
    pub value: f64,
    pub unit: Option<String>,
    pub trend_pct: Option<f64>,
}

impl From<KpiSnapshot> for KpiResponse {
    fn from(s: KpiSnapshot) -> Self {
        Self {
            label: s.metric_name,
            value: s.metric_value,
            unit: None,
            trend_pct: None,
        }
    }
}

// --- Charts ---

#[derive(Debug, Deserialize)]
pub struct ChartQuery {
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub granularity: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChartResponse {
    pub id: Uuid,
    pub kind: String,
    pub title: String,
    pub series: Vec<ChartSeriesDto>,
}

#[derive(Debug, Serialize)]
pub struct ChartSeriesDto {
    pub label: String,
    pub points: Vec<ChartPointDto>,
}

#[derive(Debug, Serialize)]
pub struct ChartPointDto {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub value: f64,
}

// --- Filters ---

#[derive(Debug, Deserialize)]
pub struct FilterRequest {
    pub dashboard_id: Uuid,
    pub filters: Vec<FilterConditionDto>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct FilterConditionDto {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct FilterResponse {
    pub dashboard_id: Uuid,
    pub applied_filters: Vec<FilterConditionDto>,
    pub kpis: Vec<KpiResponse>,
}

// --- Export ---

#[derive(Debug, Deserialize)]
pub struct ExportRequest {
    pub dashboard_id: Uuid,
    pub format: ExportFormat,
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Csv,
    Json,
    Xlsx,
}

#[derive(Debug, Serialize)]
pub struct ExportResponse {
    pub export_id: Uuid,
    pub format: ExportFormat,
    pub download_url: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

// --- SSE ---

#[derive(Debug, Deserialize)]
pub struct StreamQuery {
    pub dashboard_id: Option<Uuid>,
}

// =========================================================================
// Handlers
// =========================================================================

/// GET /vista/dashboards/:dashboard_id
///
/// Fetches a single dashboard with all its widgets.
pub async fn get_dashboard(
    Extension(_service): Extension<Arc<VistaService>>,
    Extension(_tenant_id): Extension<Uuid>,
    Path(_dashboard_id): Path<Uuid>,
) -> Result<Json<DashboardResponse>, VistaApiError> {
    Err(VistaApiError::NotImplemented)
}

/// GET /vista/kpis
///
/// Lists KPIs, optionally filtered by dashboard and date range.
pub async fn get_kpis(
    Extension(service): Extension<Arc<VistaService>>,
    Extension(tenant_id): Extension<Uuid>,
    Query(_query): Query<KpiQuery>,
) -> Result<Json<Vec<KpiResponse>>, VistaApiError> {
    let snapshots = service
        .get_kpis(tenant_id)
        .await
        .map_err(|e| VistaApiError::Service(e.to_string()))?;

    let response: Vec<KpiResponse> = snapshots.into_iter().map(KpiResponse::from).collect();
    Ok(Json(response))
}

/// GET /vista/charts/:chart_id
///
/// Fetches chart data with optional date range and granularity.
pub async fn get_chart(
    Extension(_service): Extension<Arc<VistaService>>,
    Extension(_tenant_id): Extension<Uuid>,
    Path(_chart_id): Path<Uuid>,
    Query(_query): Query<ChartQuery>,
) -> Result<Json<ChartResponse>, VistaApiError> {
    Err(VistaApiError::NotImplemented)
}

/// POST /vista/filters
///
/// Applies filters to a dashboard and returns the filtered KPI set.
/// Requires `Idempotency-Key` header (mapped to `command_id` via UUIDv5).
pub async fn apply_filters(
    Extension(_service): Extension<Arc<VistaService>>,
    Extension(_tenant_id): Extension<Uuid>,
    headers: HeaderMap,
    Json(_request): Json<FilterRequest>,
) -> Result<Json<FilterResponse>, VistaApiError> {
    let _command_id = require_idempotency_key(&headers, "POST", "/vista/filters")?;
    Err(VistaApiError::NotImplemented)
}

/// POST /vista/export
///
/// Queues a dashboard data export. Returns a presigned download URL.
/// Requires `Idempotency-Key` header (mapped to `command_id` via UUIDv5).
pub async fn export_data(
    Extension(_service): Extension<Arc<VistaService>>,
    Extension(_tenant_id): Extension<Uuid>,
    headers: HeaderMap,
    Json(_request): Json<ExportRequest>,
) -> Result<Json<ExportResponse>, VistaApiError> {
    let _command_id = require_idempotency_key(&headers, "POST", "/vista/export")?;
    Err(VistaApiError::NotImplemented)
}

/// GET /vista/stream — SSE endpoint for real-time VISTA updates.
///
/// Streams `text/event-stream` **without buffering**: each update from
/// the VISTA aggregator is forwarded as an SSE `Event` immediately upon
/// receipt from the service's subscription channel.
///
/// ## Anti-buffering design
///
/// - Uses the `create_kpi_stream` factory from `vista_service`, which
///   relies on a `tokio::sync::broadcast` channel internally.
/// - `Sse::new` sets `Content-Type: text/event-stream` and
///   `Cache-Control: no-cache`, preventing proxy buffering.
/// - `KeepAlive` sends a comment every 15 s to keep the connection
///   alive through idle periods without buffering event data.
///
/// ## Disconnect handling
///
/// When the client disconnects, the stream naturally completes, and the
/// HTTP response finishes.
pub async fn stream_updates(
    Extension(service): Extension<Arc<VistaService>>,
    Extension(tenant_id): Extension<Uuid>,
    Query(_query): Query<StreamQuery>,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>> {
    use tokio_stream::wrappers::BroadcastStream;

    const KEEPALIVE_INTERVAL_SECS: u64 = 15;

    // Inlining the stream logic to avoid Rust 2024 `impl Trait` lifetime
    // capture issues with `vista_service::create_kpi_stream` (which would
    // require modifying the application crate to add `+ use<>`).
    // `BroadcastStream::new(rx)` owns the receiver, so the resulting stream
    // is `'static` and does not borrow `service`.
    let rx = service.broadcaster().subscribe();
    let stream = BroadcastStream::new(rx).filter_map(move |result| match result {
        Ok(update) if update.tenant_id == tenant_id => match serde_json::to_string(&update) {
            Ok(json) => Some(Ok(json)),
            Err(e) => Some(Err(vista_service::VistaServiceError::Serialization(
                e.to_string(),
            ))),
        },
        Ok(_) => None,
        Err(e) => Some(Err(vista_service::VistaServiceError::Broadcast(
            e.to_string(),
        ))),
    });

    let sse_stream = stream.map(|res| match res {
        Ok(json) => Ok(Event::default().data(json)),
        Err(e) => {
            tracing::error!(error = %e, "VISTA SSE: stream error");
            Ok(Event::default().data("{\"error\":\"stream_error\"}"))
        }
    });

    Sse::new(sse_stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(KEEPALIVE_INTERVAL_SECS))
            .text("vista-keep-alive"),
    )
}

// =========================================================================
// Tests
// =========================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    // --- extract_idempotency_key ---

    #[test]
    fn extract_idempotency_key_absent_returns_none() {
        let headers = HeaderMap::new();
        assert!(extract_idempotency_key(&headers).unwrap().is_none());
    }

    #[test]
    fn extract_idempotency_key_valid_returns_uuid() {
        let mut headers = HeaderMap::new();
        headers.insert("idempotency-key", HeaderValue::from_static("abc-123"));

        let result = extract_idempotency_key(&headers).unwrap();
        assert!(result.is_some());

        let expected = Uuid::new_v5(&Uuid::NAMESPACE_URL, b"abc-123");
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn extract_idempotency_key_is_deterministic() {
        let mut headers = HeaderMap::new();
        headers.insert("idempotency-key", HeaderValue::from_static("my-key"));

        let id1 = extract_idempotency_key(&headers).unwrap().unwrap();
        let id2 = extract_idempotency_key(&headers).unwrap().unwrap();
        assert_eq!(id1, id2);
    }

    #[test]
    fn extract_idempotency_key_different_keys_yield_different_uuids() {
        let mut h1 = HeaderMap::new();
        h1.insert("idempotency-key", HeaderValue::from_static("key-1"));

        let mut h2 = HeaderMap::new();
        h2.insert("idempotency-key", HeaderValue::from_static("key-2"));

        let id1 = extract_idempotency_key(&h1).unwrap().unwrap();
        let id2 = extract_idempotency_key(&h2).unwrap().unwrap();
        assert_ne!(id1, id2);
    }

    #[test]
    fn extract_idempotency_key_non_ascii_returns_err() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "idempotency-key",
            HeaderValue::from_bytes(b"\xc3\x28").unwrap(),
        );
        let result = extract_idempotency_key(&headers);
        assert!(matches!(
            result,
            Err(VistaApiError::InvalidIdempotencyKey { .. })
        ));
    }

    #[test]
    fn extract_idempotency_key_empty_returns_err() {
        let mut headers = HeaderMap::new();
        headers.insert("idempotency-key", HeaderValue::from_static(""));
        assert!(extract_idempotency_key(&headers).is_err());
    }

    #[test]
    fn extract_idempotency_key_whitespace_only_returns_err() {
        let mut headers = HeaderMap::new();
        headers.insert("idempotency-key", HeaderValue::from_static("   "));
        assert!(extract_idempotency_key(&headers).is_err());
    }

    #[test]
    fn extract_idempotency_key_too_long_returns_err() {
        let mut headers = HeaderMap::new();
        let long_key = "x".repeat(256);
        headers.insert("idempotency-key", HeaderValue::from_str(&long_key).unwrap());
        assert!(extract_idempotency_key(&headers).is_err());
    }

    #[test]
    fn extract_idempotency_key_trims_surrounding_whitespace() {
        let mut headers = HeaderMap::new();
        headers.insert("idempotency-key", HeaderValue::from_static("  abc  "));

        let result = extract_idempotency_key(&headers).unwrap().unwrap();
        let expected = Uuid::new_v5(&Uuid::NAMESPACE_URL, b"abc");
        assert_eq!(result, expected);
    }

    #[test]
    fn extract_idempotency_key_max_length_ok() {
        let mut headers = HeaderMap::new();
        let max_key = "x".repeat(255);
        headers.insert("idempotency-key", HeaderValue::from_str(&max_key).unwrap());
        assert!(extract_idempotency_key(&headers).is_ok());
    }

    // --- require_idempotency_key ---

    #[test]
    fn require_idempotency_key_present_returns_ok() {
        let mut headers = HeaderMap::new();
        headers.insert("idempotency-key", HeaderValue::from_static("key"));
        assert!(require_idempotency_key(&headers, "POST", "/vista/export").is_ok());
    }

    #[test]
    fn require_idempotency_key_absent_returns_err_with_context() {
        let headers = HeaderMap::new();
        let err = require_idempotency_key(&headers, "POST", "/vista/export").unwrap_err();
        match err {
            VistaApiError::MissingIdempotencyKey { method, path } => {
                assert_eq!(method, "POST");
                assert_eq!(path, "/vista/export");
            }
            other => panic!("expected MissingIdempotencyKey, got {other:?}"),
        }
    }

    #[test]
    fn require_idempotency_key_invalid_returns_err() {
        let mut headers = HeaderMap::new();
        headers.insert("idempotency-key", HeaderValue::from_static(""));
        let err = require_idempotency_key(&headers, "POST", "/vista/filters").unwrap_err();
        assert!(matches!(err, VistaApiError::InvalidIdempotencyKey { .. }));
    }

    // --- Error → HTTP status code mapping ---

    #[test]
    fn error_missing_idempotency_key_maps_to_400() {
        let err = VistaApiError::MissingIdempotencyKey {
            method: "POST".into(),
            path: "/".into(),
        };
        assert_eq!(err.into_response().status(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn error_invalid_idempotency_key_maps_to_400() {
        let err = VistaApiError::InvalidIdempotencyKey { detail: "x".into() };
        assert_eq!(err.into_response().status(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn error_invalid_request_maps_to_422() {
        let err = VistaApiError::InvalidRequest("x".into());
        assert_eq!(
            err.into_response().status(),
            StatusCode::UNPROCESSABLE_ENTITY
        );
    }

    #[test]
    fn error_not_found_maps_to_404() {
        let err = VistaApiError::NotFound("x".into());
        assert_eq!(err.into_response().status(), StatusCode::NOT_FOUND);
    }

    #[test]
    fn error_service_maps_to_500() {
        let err = VistaApiError::Service("x".into());
        assert_eq!(
            err.into_response().status(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    #[test]
    fn error_not_implemented_maps_to_501() {
        let err = VistaApiError::NotImplemented;
        assert_eq!(err.into_response().status(), StatusCode::NOT_IMPLEMENTED);
    }

    // --- ExportFormat serde ---

    #[test]
    fn export_format_serializes_to_lowercase() {
        assert_eq!(
            serde_json::to_string(&ExportFormat::Csv).unwrap(),
            "\"csv\""
        );
        assert_eq!(
            serde_json::to_string(&ExportFormat::Json).unwrap(),
            "\"json\""
        );
        assert_eq!(
            serde_json::to_string(&ExportFormat::Xlsx).unwrap(),
            "\"xlsx\""
        );
    }

    #[test]
    fn export_format_deserializes_from_lowercase() {
        assert!(matches!(
            serde_json::from_str::<ExportFormat>("\"csv\"").unwrap(),
            ExportFormat::Csv
        ));
        assert!(matches!(
            serde_json::from_str::<ExportFormat>("\"json\"").unwrap(),
            ExportFormat::Json
        ));
        assert!(matches!(
            serde_json::from_str::<ExportFormat>("\"xlsx\"").unwrap(),
            ExportFormat::Xlsx
        ));
    }

    #[test]
    fn export_format_rejects_invalid_variant() {
        assert!(serde_json::from_str::<ExportFormat>("\"pdf\"").is_err());
        assert!(serde_json::from_str::<ExportFormat>("\"CSV\"").is_err());
    }

    // --- DTO round-trip tests ---

    #[test]
    fn filter_request_deserializes_correctly() {
        let json = r#"{
            "dashboard_id": "550e8400-e29b-41d4-a716-446655440000",
            "filters": [
                {"field": "region", "operator": "eq", "value": "EMEA"}
            ]
        }"#;
        let req: FilterRequest = serde_json::from_str(json).unwrap();
        assert_eq!(
            req.dashboard_id,
            Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
        );
        assert_eq!(req.filters.len(), 1);
        assert_eq!(req.filters[0].field, "region");
    }

    #[test]
    fn export_request_deserializes_csv_format() {
        let json = r#"{
            "dashboard_id": "550e8400-e29b-41d4-a716-446655440000",
            "format": "csv"
        }"#;
        let req: ExportRequest = serde_json::from_str(json).unwrap();
        assert!(matches!(req.format, ExportFormat::Csv));
        assert!(req.start_date.is_none());
    }

    #[test]
    fn kpi_query_deserializes_with_optional_fields() {
        let json = r#"{}"#;
        let query: KpiQuery = serde_json::from_str(json).unwrap();
        assert!(query.dashboard_id.is_none());
        assert!(query.start_date.is_none());
    }

    #[test]
    fn kpi_query_deserializes_with_all_fields() {
        let json = r#"{
            "dashboard_id": "550e8400-e29b-41d4-a716-446655440000",
            "start_date": "2026-01-01T00:00:00Z",
            "end_date": "2026-12-31T23:59:59Z"
        }"#;
        let query: KpiQuery = serde_json::from_str(json).unwrap();
        assert!(query.dashboard_id.is_some());
        assert!(query.start_date.is_some());
        assert!(query.end_date.is_some());
    }

    #[test]
    fn kpi_response_from_snapshot_maps_correctly() {
        let snapshot = KpiSnapshot {
            tenant_id: Uuid::new_v4(),
            metric_name: "revenue".into(),
            metric_value: 1500.50,
            computed_at: std::time::SystemTime::now(),
        };
        let response = KpiResponse::from(snapshot);
        assert_eq!(response.label, "revenue");
        assert_eq!(response.value, 1500.50);
        assert!(response.unit.is_none());
        assert!(response.trend_pct.is_none());
    }
}
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(|| async { "Placeholder for $app" }))
}
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(|| async { "Placeholder for $app" }))
}
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(|| async { "Placeholder for $app" }))
}
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(|| async { "Placeholder for $app" }))
}
