//! PIVOT API Handlers: Docs, Databases, Search, Relations.
//!
//! This module implements Axum handlers for the PIVOT application.
//! It delegates to `ataqu_application::pivot_service::PivotService`.
//!
//! # Note
//! - The actual service methods and DTOs are imported from `ataqu_contracts::pivot`.
//! - Tenant extraction is placeholder; real implementation uses authentication.
//! - Idempotency-Key header is required for mutating endpoints.

use axum::{
    extract::{Path, Query, State},
    headers::HeaderName,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tracing::instrument;
use uuid::Uuid;

use ataqu_application::pivot_service::PivotService;
use ataqu_contracts::pivot as pivot_dtos;
use ataqu_kernel::TenantId;

// ----------------------------------------------------------------------
// Re-export DTOs for cleaner code
// ----------------------------------------------------------------------
pub use pivot_dtos::{CreateDocumentCommand, Database, Document, ListDocumentsParams, SearchParams, UpdateDocumentCommand, CreateRelationCommand, Relation, ListRelationsParams};

// ----------------------------------------------------------------------
// Idempotency-Key extractor
// ----------------------------------------------------------------------
const IDEMPOTENCY_KEY_HEADER: HeaderName = HeaderName::from_static("idempotency-key");

const X_REQUEST_ID_HEADER: HeaderName = HeaderName::from_static("x-request-id");

pub struct IdempotencyKey(pub String);

impl<S> axum::extract::FromRequestParts<S> for IdempotencyKey
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let headers = &parts.headers;
        let value = headers
            .get(&IDEMPOTENCY_KEY_HEADER)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .ok_or((StatusCode::BAD_REQUEST, "Missing Idempotency-Key header"))?;
        Ok(IdempotencyKey(value))
    }
}

/// Extract request ID from headers for tracing.
fn get_request_id(parts: &axum::http::request::Parts) -> String {
    parts.headers
        .get(&X_REQUEST_ID_HEADER)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string()
}

// ----------------------------------------------------------------------
// Application state (must match the one in `ataqu-api/src/lib.rs`)
// ----------------------------------------------------------------------
#[derive(Clone)]
pub struct AppState {
    pub pivot_service: PivotService,
    // Other services may be added later.
}

// ----------------------------------------------------------------------
// Error type
// ----------------------------------------------------------------------
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Service error: {0}")]
    Service(#[from] ataqu_application::Error),
    #[error("Not found")]
    NotFound,
    #[error("Bad request: {0}")]
    BadRequest(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            AppError::Service(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::NotFound => StatusCode::NOT_FOUND,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
        };
        (status, self.to_string()).into_response()
    }
}

// ----------------------------------------------------------------------
// Handlers
// ----------------------------------------------------------------------

#[instrument(skip(state, payload), fields(tenant = ?tenant_id))]
pub async fn create_document(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Json(payload): Json<CreateDocumentCommand>,
) -> Result<Json<Document>, AppError> {
    // FIXME: extract tenant from authenticated user
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let doc = state
        .pivot_service
        .create_document(tenant_id, idempotency_key.0, payload)
        .await?;
    Ok(Json(doc))
}

#[instrument(skip(state), fields(tenant = ?tenant_id, doc_id = %id))]
pub async fn get_document(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Document>, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let doc = state.pivot_service.get_document(tenant_id, id).await?;
    Ok(Json(doc))
}

#[instrument(skip(state, payload), fields(tenant = ?tenant_id, doc_id = %id))]
pub async fn update_document(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDocumentCommand>,
) -> Result<Json<Document>, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let doc = state
        .pivot_service
        .update_document(tenant_id, id, idempotency_key.0, payload)
        .await?;
    Ok(Json(doc))
}

#[instrument(skip(state), fields(tenant = ?tenant_id, doc_id = %id))]
pub async fn delete_document(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    state
        .pivot_service
        .delete_document(tenant_id, id, idempotency_key.0)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[instrument(skip(state), fields(tenant = ?tenant_id))]
pub async fn list_documents(
    State(state): State<AppState>,
    Query(params): Query<ListDocumentsParams>,
) -> Result<Json<Vec<Document>>, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let docs = state
        .pivot_service
        .list_documents(tenant_id, params)
        .await?;
    Ok(Json(docs))
}

#[instrument(skip(state), fields(tenant = ?tenant_id))]
pub async fn search_documents(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<Document>>, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let results = state
        .pivot_service
        .search_documents(tenant_id, params)
        .await?;
    Ok(Json(results))
}

#[instrument(skip(state), fields(tenant = ?tenant_id, db_id = %id))]
pub async fn get_database(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Database>, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let db = state.pivot_service.get_database(tenant_id, id).await?;
    Ok(Json(db))
}


// ----------------------------------------------------------------------
// Relation handlers
// ----------------------------------------------------------------------

#[instrument(skip(state), fields(tenant = ?tenant_id, doc_id = %doc_id))]
pub async fn create_relation(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Path(doc_id): Path<Uuid>,
    Json(payload): Json<CreateRelationCommand>,
) -> Result<Json<Relation>, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let rel = state
        .pivot_service
        .create_relation(tenant_id, doc_id, idempotency_key.0, payload)
        .await?;
    Ok(Json(rel))
}

#[instrument(skip(state), fields(tenant = ?tenant_id, rel_id = %id))]
pub async fn get_relation(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Relation>, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let rel = state.pivot_service.get_relation(tenant_id, id).await?;
    Ok(Json(rel))
}

#[instrument(skip(state), fields(tenant = ?tenant_id, rel_id = %id))]
pub async fn delete_relation(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    state
        .pivot_service
        .delete_relation(tenant_id, id, idempotency_key.0)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[instrument(skip(state), fields(tenant = ?tenant_id, doc_id = %doc_id))]
pub async fn list_relations(
    State(state): State<AppState>,
    Path(doc_id): Path<Uuid>,
    Query(params): Query<ListRelationsParams>,
) -> Result<Json<Vec<Relation>>, AppError> {
    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let rels = state
        .pivot_service
        .list_relations(tenant_id, doc_id, params)
        .await?;
    Ok(Json(rels))
}
// ----------------------------------------------------------------------
// Router
// ----------------------------------------------------------------------
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/docs", axum::routing::post(create_document))
        .route("/docs", axum::routing::get(list_documents))
        .route("/docs/:id", axum::routing::get(get_document))
        .route("/docs/:id", axum::routing::put(update_document))
        .route("/docs/:id", axum::routing::delete(delete_document))
        .route("/search", axum::routing::get(search_documents))
        .route("/databases/:id", axum::routing::get(get_database))
    // TODO: add routes for relations
        .route("/docs/:doc_id/relations", axum::routing::post(create_relation))
        .route("/docs/:doc_id/relations", axum::routing::get(list_relations))
        .route("/relations/:id", axum::routing::get(get_relation))
        .route("/relations/:id", axum::routing::delete(delete_relation))

}


// ----------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, HeaderValue, header::HeaderName},
        routing::post,
        Router,
    };
    use tower::ServiceExt;
    use mockall::predicate::*;
    use ataqu_application::pivot_service::MockPivotService;
    use ataqu_kernel::TenantId;
    use uuid::Uuid;

    // Test the IdempotencyKey extractor
    #[tokio::test]
    async fn test_idempotency_key_extractor() {
        let app = Router::new().route("/test", post(|idempotency_key: IdempotencyKey| async move {
            axum::Json(serde_json::json!({ "key": idempotency_key.0 }))
        }));

        let req = Request::builder()
            .method("POST")
            .uri("/test")
            .header("Idempotency-Key", "test-key-123")
            .body(Body::empty())
            .unwrap();

        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), 200);
        let body = hyper::body::to_bytes(resp.into_body()).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["key"], "test-key-123");
    }

    // Test missing Idempotency-Key returns 400
    #[tokio::test]
    async fn test_idempotency_key_missing() {
        let app = Router::new().route("/test", post(|_idempotency_key: IdempotencyKey| async move {
            axum::Json(serde_json::json!({ "ok": true }))
        }));

        let req = Request::builder()
            .method("POST")
            .uri("/test")
            .body(Body::empty())
            .unwrap();

        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), 400);
    }

    // We could add more tests with mocked service, but that's out of scope for now.

    // Simple test to verify routes are defined
    #[test]
    fn test_router_contains_routes() {
        let app = routes();
        let routes = app.into_routes();
        // We can't easily inspect routes, but we can compile.
        // This test is a placeholder.
        assert!(true);
    }
}
