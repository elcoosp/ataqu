use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use serde_json::Value as JsonValue;

use ataqu_application::pivot_service::{
    PivotService, CreateDocumentCommand, CreateBlockCommand, CreateRelationCommand,
};
use ataqu_domain_pivot::block::BlockType;
use ataqu_kernel::TenantId;
use crate::AppState;

// ---------- Documents ----------
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

// ---------- Blocks ----------
#[derive(Debug, Deserialize)]
pub struct CreateBlockRequest {
    pub document_id: Uuid,
    pub block_type: String,
}

#[derive(Debug, Serialize)]
pub struct BlockResponse {
    pub id: Uuid,
    pub document_id: Uuid,
    pub block_type: String,
    pub content: JsonValue,
    pub created_at: DateTime<Utc>,
}

impl From<ataqu_application::pivot_service::Block> for BlockResponse {
    fn from(block: ataqu_application::pivot_service::Block) -> Self {
        let block_type_str = match &block.block_type {
            BlockType::Markdown(_) => "markdown".to_string(),
            BlockType::Table { .. } => "table".to_string(),
            BlockType::View { .. } => "view".to_string(),
        };
        let content = match &block.block_type {
            BlockType::Markdown(text) => serde_json::json!({ "text": text }),
            BlockType::Table { columns, rows } => serde_json::json!({ "columns": columns, "rows": rows }),
            BlockType::View { filter } => serde_json::json!({ "filter": filter }),
        };
        Self {
            id: block.id,
            document_id: block.document_id,
            block_type: block_type_str,
            content,
            created_at: block.created_at.into(),
        }
    }
}

pub async fn create_block(
    State(state): State<AppState>,
    Json(payload): Json<CreateBlockRequest>,
) -> Result<(StatusCode, Json<BlockResponse>), StatusCode> {
    use ataqu_domain_pivot::block::BlockType;
    let tenant_id = TenantId::new(Uuid::new_v4());
    let block_type = match payload.block_type.as_str() {
        "markdown" => BlockType::Markdown("".to_string()),
        "table" => BlockType::Table { columns: vec![], rows: vec![] },
        "view" => BlockType::View { filter: "".to_string() },
        _ => return Err(StatusCode::BAD_REQUEST),
    };
    let cmd = CreateBlockCommand {
        tenant_id,
        document_id: payload.document_id,
        block_type,
    };
    let block = state.pivot_service.create_block(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(block.into())))
}

pub async fn list_blocks(
    State(state): State<AppState>,
    Path(doc_id): Path<Uuid>,
) -> Result<Json<Vec<BlockResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let blocks = state.pivot_service.get_blocks_for_document(tenant_id, doc_id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(blocks.into_iter().map(|b| b.into()).collect()))
}

// ---------- Relations ----------
#[derive(Debug, Deserialize)]
pub struct CreateRelationRequest {
    pub from_block_id: Uuid,
    pub to_block_id: Uuid,
    pub relation_type: String,
}

#[derive(Debug, Serialize)]
pub struct RelationResponse {
    pub from_block_id: Uuid,
    pub to_block_id: Uuid,
    pub relation_type: String,
}

impl From<ataqu_application::pivot_service::Relation> for RelationResponse {
    fn from(rel: ataqu_application::pivot_service::Relation) -> Self {
        Self {
            from_block_id: rel.from_block_id,
            to_block_id: rel.to_block_id,
            relation_type: rel.relation_type,
        }
    }
}

pub async fn create_relation(
    State(state): State<AppState>,
    Json(payload): Json<CreateRelationRequest>,
) -> Result<(StatusCode, Json<RelationResponse>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = CreateRelationCommand {
        tenant_id,
        from_block_id: payload.from_block_id,
        to_block_id: payload.to_block_id,
        relation_type: payload.relation_type,
    };
    let rel = state.pivot_service.create_relation(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(rel.into())))
}

pub async fn list_relations(
    State(state): State<AppState>,
    Path(doc_id): Path<Uuid>,
) -> Result<Json<Vec<RelationResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let rels = state.pivot_service.get_relations_for_document(tenant_id, doc_id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(rels.into_iter().map(|r| r.into()).collect()))
}

// ---------- Search ----------
#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
}

pub async fn search_docs(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<DocumentResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    // Use the service's search method if available, otherwise fallback to list
    let docs = state.pivot_service.search_documents(tenant_id, params.q, 20, 0).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(docs.into_iter().map(|d| d.into()).collect()))
}

// ---------- Router ----------
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/docs", axum::routing::post(create_doc))
        .route("/docs", axum::routing::get(list_docs))
        .route("/docs/:id", axum::routing::get(get_doc))
        .route("/blocks", axum::routing::post(create_block))
        .route("/blocks/:doc_id", axum::routing::get(list_blocks))
        .route("/relations", axum::routing::post(create_relation))
        .route("/relations/:doc_id", axum::routing::get(list_relations))
        .route("/search", axum::routing::get(search_docs))
}
