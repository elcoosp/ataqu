use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

use ataqu_application::pivot_service::{PivotService, CreateDocumentCommand};
use ataqu_kernel::TenantId;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateDocRequest {
    pub title: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct DocumentResponse {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

impl From<ataqu_application::pivot_service::Document> for DocumentResponse {
    fn from(doc: ataqu_application::pivot_service::Document) -> Self {
        Self {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            created_at: doc.created_at.into(),
        }
    }
}

pub async fn create_doc(
    State(state): State<AppState>,
    Json(payload): Json<CreateDocRequest>,
) -> Result<(StatusCode, Json<DocumentResponse>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = CreateDocumentCommand {
        tenant_id,
        title: payload.title,
        content: payload.content,
    };
    let doc = state.pivot_service.create_document(cmd).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok((StatusCode::CREATED, Json(doc.into())))
}

pub async fn list_docs(
    State(state): State<AppState>,
) -> Result<Json<Vec<DocumentResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let docs = state.pivot_service.list_documents(tenant_id, 100, 0).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(docs.into_iter().map(|d| d.into()).collect()))
}

pub async fn get_doc(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<DocumentResponse>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let doc = state.pivot_service.get_document(tenant_id, id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(doc.into()))
}

// Placeholder stubs for block/relation endpoints (to be implemented later)
pub async fn create_relation() -> &'static str { "relation created" }
pub async fn list_relations() -> &'static str { "relations" }
pub async fn search_docs() -> &'static str { "search results" }

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/docs", axum::routing::post(create_doc))
        .route("/docs", axum::routing::get(list_docs))
        .route("/docs/:id", axum::routing::get(get_doc))
        .route("/relations", axum::routing::post(create_relation))
        .route("/relations", axum::routing::get(list_relations))
        .route("/search", axum::routing::get(search_docs))
}
