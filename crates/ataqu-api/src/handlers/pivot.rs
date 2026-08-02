//! PIVOT API Handlers - using crate::AppState.
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderName, StatusCode},
    response::{IntoResponse, Response},
};

use tracing::instrument;
use uuid::Uuid;

use ataqu_application::pivot_service::PivotService;
use ataqu_contracts::pivot as pivot_dtos;
use ataqu_kernel::TenantId;
use crate::AppState;

pub use pivot_dtos::{
    CreateDocumentCommand, CreateRelationCommand, Database, Document, ListDocumentsParams,
    ListRelationsParams, Relation, SearchParams, UpdateDocumentCommand,
};

// Idempotency-Key extractor
#[derive(Debug)]
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
            .get("Idempotency-Key")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .ok_or((StatusCode::BAD_REQUEST, "Missing Idempotency-Key header"))?;
        Ok(IdempotencyKey(value))
    }
}

// Error type
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Service error: {0}")]
    Service(String),
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

// Handlers
#[instrument(skip(state, payload))]
pub async fn create_document(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Json(payload): Json<CreateDocumentCommand>,
) -> Result<Json<Document>, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let doc = state
        .pivot_service
        .create_document(tenant_id, idempotency_key.0, payload)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(Json(doc))
}

#[instrument(skip(state))]
pub async fn get_document(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Document>, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let doc = state
        .pivot_service
        .get_document(tenant_id, id)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(Json(doc))
}

#[instrument(skip(state, payload))]
pub async fn update_document(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDocumentCommand>,
) -> Result<Json<Document>, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let doc = state
        .pivot_service
        .update_document(tenant_id, id, idempotency_key.0, payload)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(Json(doc))
}

#[instrument(skip(state))]
pub async fn delete_document(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    state
        .pivot_service
        .delete_document(tenant_id, id, idempotency_key.0)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

#[instrument(skip(state))]
pub async fn list_documents(
    State(state): State<AppState>,
    Query(params): Query<ListDocumentsParams>,
) -> Result<Json<Vec<Document>>, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let docs = state
        .pivot_service
        .list_documents(tenant_id, params)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(Json(docs))
}

#[instrument(skip(state))]
pub async fn search_documents(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<Document>>, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let docs = state
        .pivot_service
        .search_documents(tenant_id, params)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(Json(docs))
}

#[instrument(skip(state))]
pub async fn get_database(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Database>, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let db = state
        .pivot_service
        .get_database(tenant_id, id)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(Json(db))
}

#[instrument(skip(state))]
pub async fn create_relation(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Path(doc_id): Path<Uuid>,
    Json(payload): Json<CreateRelationCommand>,
) -> Result<Json<Relation>, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let rel = state
        .pivot_service
        .create_relation(tenant_id, doc_id, idempotency_key.0, payload)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(Json(rel))
}

#[instrument(skip(state))]
pub async fn get_relation(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Relation>, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let rel = state
        .pivot_service
        .get_relation(tenant_id, id)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(Json(rel))
}

#[instrument(skip(state))]
pub async fn delete_relation(
    State(state): State<AppState>,
    idempotency_key: IdempotencyKey,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    state
        .pivot_service
        .delete_relation(tenant_id, id, idempotency_key.0)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

#[instrument(skip(state))]
pub async fn list_relations(
    State(state): State<AppState>,
    Path(doc_id): Path<Uuid>,
    Query(params): Query<ListRelationsParams>,
) -> Result<Json<Vec<Relation>>, AppError> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let rels = state
        .pivot_service
        .list_relations(tenant_id, doc_id, params)
        .await
        .map_err(|e| AppError::Service(e.to_string()))?;
    Ok(Json(rels))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/docs", axum::routing::post(create_document))
        .route("/docs", axum::routing::get(list_documents))
        .route("/docs/:id", axum::routing::get(get_document))
        .route("/docs/:id", axum::routing::put(update_document))
        .route("/docs/:id", axum::routing::delete(delete_document))
        .route("/search", axum::routing::get(search_documents))
        .route("/databases/:id", axum::routing::get(get_database))
        .route(
            "/docs/:doc_id/relations",
            axum::routing::post(create_relation),
        )
        .route(
            "/docs/:doc_id/relations",
            axum::routing::get(list_relations),
        )
        .route("/relations/:id", axum::routing::get(get_relation))
        .route("/relations/:id", axum::routing::delete(delete_relation))
}
