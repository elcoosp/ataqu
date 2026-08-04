use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_application::pivot_service::{
    CreateBlockCommand, CreateDocumentCommand, CreateRelationCommand,
};
use ataqu_domain_pivot::block::BlockType;

// ---------- Databases ----------
#[derive(Debug, Deserialize)]
pub struct CreateDbRequest {
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct DatabaseResponse {
    pub id: Uuid,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

impl From<ataqu_application::pivot_service::Database> for DatabaseResponse {
    fn from(db: ataqu_application::pivot_service::Database) -> Self {
        Self {
            id: db.id,
            name: db.name,
            created_at: db.created_at.into(),
        }
    }
}

pub async fn create_db(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateDbRequest>,
) -> ApiResult<(StatusCode, Json<DatabaseResponse>)> {
    let cmd = ataqu_application::pivot_service::CreateDatabaseCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
    };
    let db = state.pivot_service.create_database(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(db.into())))
}

pub async fn list_dbs(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<DatabaseResponse>>> {
    let dbs = state.pivot_service.list_databases(auth.tenant_id, 100, 0).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(dbs.into_iter().map(|d| d.into()).collect()))
}

pub async fn delete_db(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state.pivot_service.delete_database(auth.tenant_id, id).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- Documents ----------
#[derive(Debug, Deserialize)]
pub struct CreateDocRequest {
    pub title: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocRequest {
    pub title: Option<String>,
    pub content: Option<String>,
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
    auth: AuthContext,
    Json(payload): Json<CreateDocRequest>,
) -> ApiResult<(StatusCode, Json<DocumentResponse>)> {
    if payload.title.trim().is_empty() {
        return Err(ApiResponseError::validation("Title cannot be empty"));
    }
    let cmd = CreateDocumentCommand {
        tenant_id: auth.tenant_id,
        title: payload.title,
        content: payload.content,
    };
    let doc = state
        .pivot_service
        .create_document(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(doc.into())))
}

pub async fn list_docs(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<DocumentResponse>>> {
    let docs = state
        .pivot_service
        .list_documents(auth.tenant_id, params.limit.unwrap_or(100), params.offset.unwrap_or(0))
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(docs.into_iter().map(|d| d.into()).collect()))
}

pub async fn get_doc(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<DocumentResponse>> {
    let doc = state
        .pivot_service
        .get_document(auth.tenant_id, id)
        .await
        .map_err(|e| match e {
            ataqu_application::pivot_service::PivotServiceError::DocumentNotFound => {
                ApiResponseError::not_found("Document not found")
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(Json(doc.into()))
}

pub async fn update_doc(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDocRequest>,
) -> ApiResult<Json<DocumentResponse>> {
    let doc = state
        .pivot_service
        .update_document(auth.tenant_id, id, payload.title, payload.content)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(doc.into()))
}

pub async fn delete_doc(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .pivot_service
        .delete_document(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
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
            BlockType::Table { columns, rows } => {
                serde_json::json!({ "columns": columns, "rows": rows })
            }
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
    auth: AuthContext,
    Json(payload): Json<CreateBlockRequest>,
) -> ApiResult<(StatusCode, Json<BlockResponse>)> {
    let block_type = match payload.block_type.as_str() {
        "markdown" => BlockType::Markdown("".to_string()),
        "table" => BlockType::Table {
            columns: vec![],
            rows: vec![],
        },
        "view" => BlockType::View {
            filter: "".to_string(),
        },
        _ => return Err(ApiResponseError::validation("Invalid block_type")),
    };
    let cmd = CreateBlockCommand {
        tenant_id: auth.tenant_id,
        document_id: payload.document_id,
        block_type,
    };
    let block = state
        .pivot_service
        .create_block(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(block.into())))
}

pub async fn list_blocks(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(doc_id): Path<Uuid>,
) -> ApiResult<Json<Vec<BlockResponse>>> {
    let blocks = state
        .pivot_service
        .get_blocks_for_document(auth.tenant_id, doc_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
    auth: AuthContext,
    Json(payload): Json<CreateRelationRequest>,
) -> ApiResult<(StatusCode, Json<RelationResponse>)> {
    let cmd = CreateRelationCommand {
        tenant_id: auth.tenant_id,
        from_block_id: payload.from_block_id,
        to_block_id: payload.to_block_id,
        relation_type: payload.relation_type,
    };
    let rel = state
        .pivot_service
        .create_relation(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(rel.into())))
}

pub async fn list_relations(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(doc_id): Path<Uuid>,
) -> ApiResult<Json<Vec<RelationResponse>>> {
    let rels = state
        .pivot_service
        .get_relations_for_document(auth.tenant_id, doc_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(rels.into_iter().map(|r| r.into()).collect()))
}

// ---------- Search ----------
#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
}

pub async fn search_docs(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<SearchParams>,
) -> ApiResult<Json<Vec<DocumentResponse>>> {
    let docs = state
        .pivot_service
        .search_documents(auth.tenant_id, params.q, 20, 0)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(docs.into_iter().map(|d| d.into()).collect()))
}

// ---------- Router ----------
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/databases", axum::routing::post(create_db).get(list_dbs))
        .route("/databases/:id", axum::routing::delete(delete_db))
        .route("/docs", axum::routing::post(create_doc).get(list_docs))
        .route(
            "/docs/:id",
            axum::routing::get(get_doc).put(update_doc).delete(delete_doc),
        )
        .route("/documents/:id/blocks", axum::routing::get(list_blocks))
        .route("/blocks", axum::routing::post(create_block))
        .route("/relations", axum::routing::post(create_relation))
        .route("/documents/:id/relations", axum::routing::get(list_relations))
        .route("/search", axum::routing::get(search_docs))
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}
