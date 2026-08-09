use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
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
    let db = state
        .pivot_service
        .create_database(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok((StatusCode::CREATED, Json(db.into())))
}

pub async fn list_dbs(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<DatabaseResponse>>> {
    let dbs = state
        .pivot_service
        .list_databases(auth.tenant_id, 100, 0)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(dbs.into_iter().map(|d| d.into()).collect()))
}

pub async fn delete_db(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .pivot_service
        .delete_database(auth.tenant_id, id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

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
    pub version: i32,
}

impl From<ataqu_application::pivot_service::Document> for DocumentResponse {
    fn from(doc: ataqu_application::pivot_service::Document) -> Self {
        Self {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            created_at: doc.created_at.into(),
            version: doc.version,
        }
    }
}

pub async fn create_doc(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateDocRequest>,
) -> ApiResult<impl IntoResponse> {
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
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", doc.version).parse().unwrap(),
    );
    Ok((
        StatusCode::CREATED,
        headers,
        Json(DocumentResponse::from(doc)),
    ))
}

pub async fn list_docs(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<DocumentResponse>>> {
    let docs = state
        .pivot_service
        .list_documents(
            auth.tenant_id,
            params.limit.unwrap_or(100),
            params.offset.unwrap_or(0),
        )
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(docs.into_iter().map(|d| d.into()).collect()))
}

pub async fn get_doc(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResult<axum::response::Response> {
    let doc = state
        .pivot_service
        .get_document(auth.tenant_id, id)
        .await
        .map_err(|e| match e {
            ataqu_application::pivot_service::PivotServiceError::DocumentNotFound => {
                ApiResponseError::not_found("Document not found")
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    let etag = format!("\"{}\"", doc.version);
    let mut resp_headers = axum::http::HeaderMap::new();
    resp_headers.insert(axum::http::header::ETAG, etag.parse().unwrap());

    if let Some(if_none_match) = headers.get(axum::http::header::IF_NONE_MATCH)
        && if_none_match
            .to_str()
            .map(|s| s == etag.as_str())
            .unwrap_or(false)
        {
            return Ok((StatusCode::NOT_MODIFIED, resp_headers).into_response());
        }
    Ok((
        StatusCode::OK,
        resp_headers,
        Json(DocumentResponse::from(doc)),
    )
        .into_response())
}

pub async fn update_doc(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateDocRequest>,
) -> ApiResult<Json<DocumentResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    let doc = state
        .pivot_service
        .update_document(auth.tenant_id, id, payload.title, payload.content, if_match)
        .await
        .map_err(|e| match e {
            ataqu_application::pivot_service::PivotServiceError::Validation(msg)
                if msg.contains("Version mismatch") =>
            {
                ApiResponseError::conflict(&msg)
            }
            ataqu_application::pivot_service::PivotServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
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
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

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
    pub version: i32,
}

impl From<ataqu_application::pivot_service::Block> for BlockResponse {
    fn from(block: ataqu_application::pivot_service::Block) -> Self {
        let block_type_str = match &block.block_type {
            BlockType::Markdown(_) => "markdown".to_string(),
            BlockType::Table { .. } => "table".to_string(),
            BlockType::View { .. } => "view".to_string(),
            BlockType::Checklist { .. } => "checklist".to_string(),
        };
        let content = match &block.block_type {
            BlockType::Markdown(text) => serde_json::json!({ "text": text }),
            BlockType::Table { columns, rows } => {
                serde_json::json!({ "columns": columns, "rows": rows })
            }
            BlockType::View { filter } => serde_json::json!({ "filter": filter }),
            BlockType::Checklist { items } => serde_json::json!({ "items": items }),
        };
        Self {
            id: block.id,
            document_id: block.document_id,
            block_type: block_type_str,
            content,
            created_at: block.created_at.into(),
            version: block.version,
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
        "checklist" => BlockType::Checklist { items: vec![] },
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
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
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
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(blocks.into_iter().map(|b| b.into()).collect()))
}

#[derive(Debug, Deserialize)]
pub struct UpdateBlockRequest {
    pub block_type: Option<String>,
    pub content: Option<JsonValue>,
}

pub async fn update_block(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateBlockRequest>,
) -> ApiResult<Json<BlockResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    let block_type = if let Some(bt_str) = payload.block_type {
        let content = payload.content.unwrap_or(JsonValue::Null);
        match bt_str.as_str() {
            "markdown" => BlockType::Markdown(
                content
                    .get("text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
            ),
            "table" => BlockType::Table {
                columns: content
                    .get("columns")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default(),
                rows: content
                    .get("rows")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|row| {
                                row.as_array().map(|r| {
                                    r.iter()
                                        .filter_map(|v| v.as_str().map(String::from))
                                        .collect()
                                })
                            })
                            .collect()
                    })
                    .unwrap_or_default(),
            },
            "view" => BlockType::View {
                filter: content
                    .get("filter")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
            },
            "checklist" => BlockType::Checklist {
                items: content
                    .get("items")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| serde_json::from_value(v.clone()).ok())
                            .collect()
                    })
                    .unwrap_or_default(),
            },
            _ => return Err(ApiResponseError::validation("Invalid block_type")),
        }
    } else {
        return Err(ApiResponseError::validation(
            "block_type is required for update",
        ));
    };

    let block = state
        .pivot_service
        .update_block(auth.tenant_id, id, block_type, if_match)
        .await
        .map_err(|e| match e {
            ataqu_application::pivot_service::PivotServiceError::Validation(msg)
                if msg.contains("Version mismatch") =>
            {
                ApiResponseError::conflict(&msg)
            }
            ataqu_application::pivot_service::PivotServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(Json(block.into()))
}

pub async fn delete_block(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .pivot_service
        .delete_block(auth.tenant_id, id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

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
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
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
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(rels.into_iter().map(|r| r.into()).collect()))
}

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
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(docs.into_iter().map(|d| d.into()).collect()))
}

pub async fn list_doc_versions(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let versions = state
        .pivot_service
        .list_document_versions(auth.tenant_id, id, 20)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let list = versions
        .iter()
        .map(|v| {
            serde_json::json!({
                "id": v.id,
                "title": v.title,
                "content": v.content,
                "created_at": v.created_at,
            })
        })
        .collect();
    Ok(Json(list))
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub content: String,
}

pub async fn create_template(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateTemplateRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let template = state
        .pivot_service
        .create_template(auth.tenant_id, payload.name, payload.content)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(serde_json::json!({ "id": template.id })))
}

pub async fn list_templates(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let templates = state
        .pivot_service
        .list_templates(auth.tenant_id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let list = templates
        .iter()
        .map(|t| {
            serde_json::json!({
                "id": t.id,
                "name": t.name,
                "content": t.content,
                "created_at": t.created_at,
            })
        })
        .collect();
    Ok(Json(list))
}

pub async fn apply_template(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(template_id): Path<Uuid>,
) -> ApiResult<impl IntoResponse> {
    let doc = state
        .pivot_service
        .apply_template(auth.tenant_id, template_id)
        .await
        .map_err(|e| match e {
            ataqu_application::pivot_service::PivotServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", doc.version).parse().unwrap(),
    );
    Ok((
        StatusCode::CREATED,
        headers,
        Json(DocumentResponse::from(doc)),
    ))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/databases", axum::routing::post(create_db).get(list_dbs))
        .route("/databases/:id", axum::routing::delete(delete_db))
        .route("/docs", axum::routing::post(create_doc).get(list_docs))
        .route("/docs/:id/versions", axum::routing::get(list_doc_versions))
        .route(
            "/docs/:id",
            axum::routing::get(get_doc)
                .put(update_doc)
                .delete(delete_doc),
        )
        .route("/docs/:id/blocks", axum::routing::get(list_blocks))
        .route("/blocks", axum::routing::post(create_block))
        .route(
            "/blocks/:id",
            axum::routing::put(update_block).delete(delete_block),
        )
        .route("/relations", axum::routing::post(create_relation))
        .route("/docs/:id/relations", axum::routing::get(list_relations))
        .route("/search", axum::routing::get(search_docs))
        .route(
            "/templates",
            axum::routing::post(create_template).get(list_templates),
        )
        .route(
            "/templates/:id/apply",
            axum::routing::post(apply_template),
        )
}
