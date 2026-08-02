//! CINQ (CRM) HTTP handlers.
//!
//! All endpoints include idempotency-key support and proper error mapping.

use axum::{
    extract::{Path, Query, State, Multipart},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response, Json},
    Router,
    routing::{get, post, put, delete},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use tracing::debug;

use ataqu_application::cinq_service::CinqService;
use ataqu_kernel::{TenantId, IdGenerator, Clock};
use ataqu_contracts::cinq::*;
use ataqu_security::{Email, PiiAccessKey};

// ---------- Error mapping ----------

/// API error types mapped to HTTP status codes.
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Idempotency key is required")]
    MissingIdempotencyKey,
    #[error("Invalid idempotency key format")]
    InvalidIdempotencyKey,
    #[error("Resource not found")]
    NotFound,
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("Too Many Requests")]
    TooManyRequests,
    #[error("Service unavailable (idempotency lock timeout)")]
    ServiceUnavailable,
    #[error("Internal server error")]
    Internal,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, body) = match self {
            ApiError::MissingIdempotencyKey => (StatusCode::BAD_REQUEST, "Idempotency-Key header required"),
            ApiError::InvalidIdempotencyKey => (StatusCode::BAD_REQUEST, "Idempotency-Key must be a valid UUIDv5"),
            ApiError::NotFound => (StatusCode::NOT_FOUND, "Resource not found"),
            ApiError::Validation(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg),
            ApiError::Conflict(msg) => (StatusCode::CONFLICT, msg),
            ApiError::TooManyRequests => (StatusCode::TOO_MANY_REQUESTS, "Too many requests"),
            ApiError::ServiceUnavailable => (StatusCode::SERVICE_UNAVAILABLE, "Idempotency lock timeout, retry later"),
            ApiError::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
        };
        (status, body).into_response()
    }
}

impl From<ataqu_application::cinq_service::Error> for ApiError {
    fn from(err: ataqu_application::cinq_service::Error) -> Self {
        match err {
            ataqu_application::cinq_service::Error::NotFound => ApiError::NotFound,
            ataqu_application::cinq_service::Error::Validation(msg) => ApiError::Validation(msg),
            ataqu_application::cinq_service::Error::Conflict(msg) => ApiError::Conflict(msg),
            ataqu_application::cinq_service::Error::IdempotencyLockTimeout => ApiError::ServiceUnavailable,
            ataqu_application::cinq_service::Error::TooManyRequests => ApiError::TooManyRequests,
            _ => ApiError::Internal,
        }
    }
}

// ---------- Idempotency key extractor ----------

/// Extracts the `Idempotency-Key` header and maps it to a deterministic UUIDv5.
///
/// The key must be a valid UUID (any version) and will be used as namespace to
/// generate a UUIDv5 for the `command_id` used by the idempotency guard.
pub struct IdempotencyKey(pub Uuid);

impl<S> axum::extract::FromRequestParts<S> for IdempotencyKey
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let headers = &parts.headers;
        let key = headers
            .get("Idempotency-Key")
            .ok_or(ApiError::MissingIdempotencyKey)?
            .to_str()
            .map_err(|_| ApiError::InvalidIdempotencyKey)?;

        // Parse as UUID; if invalid, reject.
        let uuid = Uuid::parse_str(key).map_err(|_| ApiError::InvalidIdempotencyKey)?;
        // Generate a deterministic UUIDv5 using the namespace UUIDv5 of the key.
        // We use the NAMESPACE_DNS as base for determinism.
        let command_id = Uuid::new_v5(&Uuid::NAMESPACE_DNS, uuid.as_bytes());
        Ok(IdempotencyKey(command_id))
    }
}


// ---------- Tenant extraction from authentication ----------

/// Extracts the tenant ID from the request extensions.
/// Requires that the auth middleware has inserted a `TenantId` into `parts.extensions`.
pub struct AuthenticatedTenant(pub TenantId);

impl<S> axum::extract::FromRequestParts<S> for AuthenticatedTenant
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let ext = &parts.extensions;
        ext.get::<TenantId>()
            .cloned()
            .map(AuthenticatedTenant)
            .ok_or(ApiError::Internal)   // Or Unauthorized? But we'll map to Internal for now.
    }
}


// ---------- Shared state ----------

#[derive(Clone)]
pub struct AppState {
    pub service: Arc<CinqService>,
}

// ---------- Handlers ----------

/// POST /contacts
pub async fn create_contact(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Json(payload): Json<CreateContactRequest>,
) -> Result<Json<ContactResponse>, ApiError> {
    debug!(command_id = %idempotency_key.0, "create_contact");
    // TODO: extract tenant_id from authentication (currently placeholder)
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn create_contact(");
    let result = state
        .service
        .create_contact(tenant_id, idempotency_key.0, payload)
        .await?;
    Ok(Json(result))
}

/// GET /contacts
pub async fn list_contacts(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    // TODO: add pagination query params
) -> Result<Json<Vec<ContactResponse>>, ApiError> {
    // TODO: extract tenant_id
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn list_contacts(");
    let result = state.service.list_contacts(tenant_id).await?;
    Ok(Json(result))
}

/// GET /contacts/:id
pub async fn get_contact(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    Path(id): Path<Uuid>,
) -> Result<Json<ContactResponse>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn get_contact(");
    let result = state.service.get_contact(tenant_id, id).await?;
    Ok(Json(result))
}

/// PUT /contacts/:id
pub async fn update_contact(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateContactRequest>,
) -> Result<Json<ContactResponse>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn update_contact(");
    let result = state
        .service
        .update_contact(tenant_id, id, idempotency_key.0, payload)
        .await?;
    Ok(Json(result))
}

/// DELETE /contacts/:id
pub async fn delete_contact(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn delete_contact(");
    state
        .service
        .delete_contact(tenant_id, id, idempotency_key.0)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- Deals ----------

/// POST /deals
pub async fn create_deal(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Json(payload): Json<CreateDealRequest>,
) -> Result<Json<DealResponse>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn create_deal(");
    let result = state
        .service
        .create_deal(tenant_id, idempotency_key.0, payload)
        .await?;
    Ok(Json(result))
}

/// GET /deals
pub async fn list_deals(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
) -> Result<Json<Vec<DealResponse>>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn list_deals(");
    let result = state.service.list_deals(tenant_id).await?;
    Ok(Json(result))
}

/// GET /deals/:id
pub async fn get_deal(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    Path(id): Path<Uuid>,
) -> Result<Json<DealResponse>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn get_deal(");
    let result = state.service.get_deal(tenant_id, id).await?;
    Ok(Json(result))
}

/// PUT /deals/:id
pub async fn update_deal(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDealRequest>,
) -> Result<Json<DealResponse>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn update_deal(");
    let result = state
        .service
        .update_deal(tenant_id, id, idempotency_key.0, payload)
        .await?;
    Ok(Json(result))
}

/// DELETE /deals/:id
pub async fn delete_deal(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn delete_deal(");
    state
        .service
        .delete_deal(tenant_id, id, idempotency_key.0)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- Pipeline (stages) ----------

/// GET /pipeline/stages
pub async fn list_pipeline_stages(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
) -> Result<Json<Vec<PipelineStageResponse>>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn list_pipeline_stages(");
    let result = state.service.list_pipeline_stages(tenant_id).await?;
    Ok(Json(result))
}

/// POST /pipeline/stages
pub async fn create_pipeline_stage(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Json(payload): Json<CreatePipelineStageRequest>,
) -> Result<Json<PipelineStageResponse>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn create_pipeline_stage(");
    let result = state
        .service
        .create_pipeline_stage(tenant_id, idempotency_key.0, payload)
        .await?;
    Ok(Json(result))
}

/// PUT /pipeline/stages/:id
pub async fn update_pipeline_stage(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePipelineStageRequest>,
) -> Result<Json<PipelineStageResponse>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn update_pipeline_stage(");
    let result = state
        .service
        .update_pipeline_stage(tenant_id, id, idempotency_key.0, payload)
        .await?;
    Ok(Json(result))
}

/// DELETE /pipeline/stages/:id
pub async fn delete_pipeline_stage(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn delete_pipeline_stage(");
    state
        .service
        .delete_pipeline_stage(tenant_id, id, idempotency_key.0)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- Activities ----------

/// POST /activities
pub async fn create_activity(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Json(payload): Json<CreateActivityRequest>,
) -> Result<Json<ActivityResponse>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn create_activity(");
    let result = state
        .service
        .create_activity(tenant_id, idempotency_key.0, payload)
        .await?;
    Ok(Json(result))
}

/// GET /activities
pub async fn list_activities(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    Query(params): Query<ListActivitiesParams>,
) -> Result<Json<Vec<ActivityResponse>>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn list_activities(");
    let result = state.service.list_activities(tenant_id, params).await?;
    Ok(Json(result))
}

/// GET /activities/:id
pub async fn get_activity(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    Path(id): Path<Uuid>,
) -> Result<Json<ActivityResponse>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn get_activity(");
    let result = state.service.get_activity(tenant_id, id).await?;
    Ok(Json(result))
}

// ---------- Search ----------

/// GET /search?q=...
pub async fn search_contacts(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<ContactResponse>>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn search_contacts(");
    let result = state.service.search_contacts(tenant_id, params).await?;
    Ok(Json(result))
}

// ---------- CSV Import/Export ----------

/// POST /csv/import
/// Multipart form with file.

pub async fn import_csv(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    mut multipart: Multipart,
) -> Result<Json<ImportCsvResult>, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn import_csv(");
    let span = tracing::info_span!("handler", tenant_id = %tenant_id, command_id = %idempotency_key.0);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, command_id = %idempotency_key.0, "import_csv");

    // Extract file from multipart
    let mut csv_content = None;
    while let Some(field) = multipart.next_field().await.map_err(|_| ApiError::Internal)? {
        if field.name() == Some("file") {
            // Use text() to get the string directly, which reads the entire body into memory.
            // For large files, this could be heavy; future improvement: stream using csv_async.
            let text = field.text().await.map_err(|_| ApiError::Internal)?;
            csv_content = Some(text);
            break;
        }
    }
    let csv_content = csv_content.ok_or_else(|| ApiError::Validation("No file uploaded".to_string()))?;
    let result = state
        .service
        .import_csv(tenant_id, idempotency_key.0, csv_content)
        .await?;
    Ok(Json(result))
}

/// GET /csv/export
pub async fn export_csv(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
) -> Result<Response, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn export_csv(");
    let csv = state.service.export_csv(tenant_id).await?;
    let response = (StatusCode::OK, [(axum::http::header::CONTENT_TYPE, "text/csv")], csv).into_response();
    Ok(response)
}

// ---------- Email Tracking ----------

/// POST /email/track
/// Record an email open/click event.
pub async fn track_email(
    State(state): State<Arc<AppState>>, tenant: AuthenticatedTenant,
    idempotency_key: IdempotencyKey,
    Json(payload): Json<TrackEmailRequest>,
) -> Result<StatusCode, ApiError> {
    let AuthenticatedTenant(tenant_id) = tenant;
    let span = tracing::info_span!("handler", tenant_id = %tenant_id);
    let _guard = span.enter();
    debug!(tenant_id = %tenant_id, "Handling pub async fn track_email(");
    state
        .service
        .track_email(tenant_id, idempotency_key.0, payload)
        .await?;
    Ok(StatusCode::ACCEPTED)
}

// ---------- Router ----------

pub fn cinq_routes() -> Router<Arc<AppState>> {
    Router::new()
        // Contacts
        .route("/contacts", post(create_contact))
        .route("/contacts", get(list_contacts))
        .route("/contacts/:id", get(get_contact))
        .route("/contacts/:id", put(update_contact))
        .route("/contacts/:id", delete(delete_contact))
        // Deals
        .route("/deals", post(create_deal))
        .route("/deals", get(list_deals))
        .route("/deals/:id", get(get_deal))
        .route("/deals/:id", put(update_deal))
        .route("/deals/:id", delete(delete_deal))
        // Pipeline
        .route("/pipeline/stages", get(list_pipeline_stages))
        .route("/pipeline/stages", post(create_pipeline_stage))
        .route("/pipeline/stages/:id", put(update_pipeline_stage))
        .route("/pipeline/stages/:id", delete(delete_pipeline_stage))
        // Activities
        .route("/activities", post(create_activity))
        .route("/activities", get(list_activities))
        .route("/activities/:id", get(get_activity))
        // Search
        .route("/search", get(search_contacts))
        // CSV
        .route("/csv/import", post(import_csv))
        .route("/csv/export", get(export_csv))
        // Email tracking
        .route("/email/track", post(track_email))
}

// ---------- Tests ----------

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;
    use tower::ServiceExt;

    // Simple test to ensure router builds.
    #[tokio::test]
    async fn router_builds() {
        let _router = cinq_routes();
    }

    // Test idempotency key extraction.
    #[tokio::test]
    async fn idempotency_key_extractor_valid() {
        let key = Uuid::new_v4();
        let mut req = Request::builder()
            .uri("/")
            .header("Idempotency-Key", key.to_string())
            .body(())
            .unwrap();
        let (mut parts, _) = req.into_parts();
        let result = IdempotencyKey::from_request_parts(&mut parts, &()).await;
        assert!(result.is_ok());
        let idempotency = result.unwrap();
        // It should be a UUIDv5 (deterministic)
        assert_eq!(idempotency.0.get_version(), uuid::Version::Sha1);
    }

    #[tokio::test]
    async fn idempotency_key_extractor_missing() {
        let req = Request::builder().uri("/").body(()).unwrap();
        let (mut parts, _) = req.into_parts();
        let result = IdempotencyKey::from_request_parts(&mut parts, &()).await;
        assert!(matches!(result, Err(ApiError::MissingIdempotencyKey)));
    }

    #[tokio::test]
    async fn idempotency_key_extractor_invalid() {
        let mut req = Request::builder()
            .uri("/")
            .header("Idempotency-Key", "not-a-uuid")
            .body(())
            .unwrap();
        let (mut parts, _) = req.into_parts();
        let result = IdempotencyKey::from_request_parts(&mut parts, &()).await;
        assert!(matches!(result, Err(ApiError::InvalidIdempotencyKey)));
    }
}


#[cfg(test)]
mod integration_tests {
    use super::*;
    use axum::Router;
    use axum::http::Request;
    use tower::ServiceExt;
    use std::sync::Arc;
    use mockall::predicate::*;
    use ataqu_application::cinq_service::MockCinqService;

    #[tokio::test]
    async fn test_create_contact_handler() {
        // Setup mock service
        let mut mock = MockCinqService::new();
        mock.expect_create_contact()
            .with(eq(TenantId::new(Uuid::nil())), any(), any())
            .returning(|_, _, _| Ok(ContactResponse::default()));

        let state = Arc::new(AppState {
            service: Arc::new(mock),
        });

        let app = Router::new()
            .route("/contacts", post(create_contact))
            .with_state(state);

        let key = Uuid::new_v4();
        let req = Request::builder()
            .method("POST")
            .uri("/contacts")
            .header("Idempotency-Key", key.to_string())
            .header("Content-Type", "application/json")
            .body(axum::body::Body::from(r#"{"name":"Test","email":"test@example.com"}"#))
            .unwrap();

        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
    }
}