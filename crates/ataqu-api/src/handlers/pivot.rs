use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    Router,
};
use uuid::Uuid;
use serde::Deserialize;

use ataqu_contracts::pivot::{Document, CreateDocumentCommand, UpdateDocumentCommand};
use ataqu_kernel::TenantId;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateDocRequest {
    pub title: String,
    pub content: String,
}

pub async fn create_doc(
    State(state): State<AppState>,
    Json(payload): Json<CreateDocRequest>,
) -> Result<(StatusCode, Json<Document>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let command_id = Uuid::new_v4().to_string();
    let cmd = CreateDocumentCommand {
        title: payload.title,
        content: payload.content,
    };
    let doc = state.pivot_service.create_document(tenant_id, command_id, cmd).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok((StatusCode::CREATED, Json(doc)))
}

pub async fn list_docs(
    State(state): State<AppState>,
) -> Result<Json<Vec<Document>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let params = ataqu_contracts::pivot::ListDocumentsParams { limit: None, offset: None };
    let docs = state.pivot_service.list_documents(tenant_id, params).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(docs))
}

pub async fn get_doc(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Document>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let doc = state.pivot_service.get_document(tenant_id, id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(doc))
}

pub async fn update_doc(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDocumentCommand>,
) -> Result<Json<Document>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let command_id = Uuid::new_v4().to_string();
    let doc = state.pivot_service.update_document(tenant_id, id, command_id, payload).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(doc))
}

pub async fn delete_doc(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let command_id = Uuid::new_v4().to_string();
    state.pivot_service.delete_document(tenant_id, id, command_id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(StatusCode::NO_CONTENT)
}

// Placeholder stubs for relations and search
pub async fn create_relation(
    State(state): State<AppState>,
    Json(payload): Json<ataqu_contracts::pivot::CreateRelationCommand>,
) -> Result<Json<ataqu_contracts::pivot::Relation>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let command_id = Uuid::new_v4().to_string();
    let doc_id = Uuid::new_v4(); // We don't have doc_id in payload? Actually contract doesn't have doc_id.
    // We'll skip for now.
    let rel = state.pivot_service.create_relation(tenant_id, doc_id, command_id, payload).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(rel))
}
pub async fn list_relations(
    State(state): State<AppState>,
    Path(doc_id): Path<Uuid>,
) -> Result<Json<Vec<ataqu_contracts::pivot::Relation>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let params = ataqu_contracts::pivot::ListRelationsParams { limit: None, offset: None };
    let rels = state.pivot_service.list_relations(tenant_id, doc_id, params).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(rels))
}
pub async fn search_docs(
    State(state): State<AppState>,
    Query(params): Query<ataqu_contracts::pivot::SearchParams>,
) -> Result<Json<Vec<ataqu_contracts::pivot::Document>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let docs = state.pivot_service.search_documents(tenant_id, params).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(docs))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/docs", axum::routing::post(create_doc))
        .route("/docs", axum::routing::get(list_docs))
        .route("/docs/:id", axum::routing::get(get_doc))
        .route("/docs/:id", axum::routing::put(update_doc))
        .route("/docs/:id", axum::routing::delete(delete_doc))
        .route("/relations", axum::routing::post(create_relation))
        .route("/relations", axum::routing::get(list_relations))
        .route("/search", axum::routing::get(search_docs))
}
