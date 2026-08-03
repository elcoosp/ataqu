//! DIAL API Handlers
use axum::{
    extract::{Extension, Json, Path, Query, ws::WebSocketUpgrade},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use async_trait::async_trait;
use tracing::{error, info, instrument};

// Use local error type
use crate::error::ApiResult; // Fixed import
use uuid::Uuid;
pub type TenantId = Uuid;
pub type UserId = Uuid;

// Convert anyhow errors to 500


// ======================================================================
// Local DialService trait – this will be implemented by the application layer.
// The handlers only depend on this trait.
// ======================================================================
#[async_trait]
pub trait DialService: Send + Sync {
    async fn list_channels(&self) -> Result<Vec<ChannelSummary>, anyhow::Error>;
    async fn create_channel(&self, req: CreateChannelRequest) -> Result<Channel, anyhow::Error>;
    async fn get_channel(&self, id: Uuid) -> Result<Channel, anyhow::Error>;
    async fn list_messages(
        &self,
        channel_id: Uuid,
        params: MessageListParams,
    ) -> Result<MessageListResponse, anyhow::Error>;
    async fn send_message(
        &self,
        channel_id: Uuid,
        req: SendMessageRequest,
        idempotency_key: Option<String>,
    ) -> Result<Message, anyhow::Error>;
    async fn list_threads(&self, channel_id: Uuid) -> Result<Vec<ThreadSummary>, anyhow::Error>;
    async fn create_thread(
        &self,
        channel_id: Uuid,
        req: CreateThreadRequest,
    ) -> Result<Thread, anyhow::Error>;
    async fn generate_upload_url(
        &self,
        req: UploadUrlRequest,
    ) -> Result<UploadUrlResponse, anyhow::Error>;
    async fn search_messages(&self, params: SearchParams) -> Result<SearchResults, anyhow::Error>;
    async fn register_presence(&self) -> Result<(), anyhow::Error>;
    async fn unregister_presence(&self) -> Result<(), anyhow::Error>;
}

// ======================================================================
// Handlers
// ======================================================================

#[instrument(skip(dial_service))]
pub async fn list_channels(
    _tenant_id: TenantId,
    _user_id: UserId,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
) -> ApiResult<Json<Vec<ChannelSummary>>> {
    info!("Listing channels");
    let channels = dial_service.list_channels().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(channels))
}

#[instrument(skip(dial_service))]
pub async fn create_channel(
    _tenant_id: TenantId,
    _user_id: UserId,
    Json(payload): Json<CreateChannelRequest>,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
) -> ApiResult<Json<Channel>> {
    info!("Creating channel: {}", payload.name);
    let channel = dial_service.create_channel(payload).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(channel))
}

#[instrument(skip(dial_service))]
pub async fn get_channel(
    Path(channel_id): Path<Uuid>,
    _tenant_id: TenantId,
    _user_id: UserId,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
) -> ApiResult<Json<Channel>> {
    info!("Getting channel: {}", channel_id);
    let channel = dial_service.get_channel(channel_id).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(channel))
}

#[instrument(skip(dial_service))]
pub async fn list_messages(
    Path(channel_id): Path<Uuid>,
    Query(params): Query<MessageListParams>,
    _tenant_id: TenantId,
    _user_id: UserId,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
) -> ApiResult<Json<MessageListResponse>> {
    info!("Listing messages for channel {}", channel_id);
    let resp = dial_service.list_messages(channel_id, params).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(resp))
}

#[instrument(skip(dial_service, headers))]
pub async fn send_message(
    Path(channel_id): Path<Uuid>,
    Json(payload): Json<SendMessageRequest>,
    _tenant_id: TenantId,
    _user_id: UserId,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
    headers: HeaderMap,
) -> ApiResult<Json<Message>> {
    let idempotency_key = headers
        .get("Idempotency-Key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    info!(
        "Sending message to channel {} with idempotency_key: {:?}",
        channel_id, idempotency_key
    );
    let msg = dial_service
        .send_message(channel_id, payload, idempotency_key)
        .await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(msg))
}

#[instrument(skip(dial_service))]
pub async fn list_threads(
    Path(channel_id): Path<Uuid>,
    _tenant_id: TenantId,
    _user_id: UserId,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
) -> ApiResult<Json<Vec<ThreadSummary>>> {
    info!("Listing threads for channel {}", channel_id);
    let threads = dial_service.list_threads(channel_id).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(threads))
}

#[instrument(skip(dial_service))]
pub async fn create_thread(
    Path(channel_id): Path<Uuid>,
    Json(payload): Json<CreateThreadRequest>,
    _tenant_id: TenantId,
    _user_id: UserId,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
) -> ApiResult<Json<Thread>> {
    info!(
        "Creating thread in channel {}: {}",
        channel_id, payload.name
    );
    let thread = dial_service.create_thread(channel_id, payload).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(thread))
}

#[instrument(skip(dial_service))]
pub async fn get_upload_url(
    _tenant_id: TenantId,
    _user_id: UserId,
    Json(payload): Json<UploadUrlRequest>,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
) -> ApiResult<Json<UploadUrlResponse>> {
    info!("Getting upload URL for file: {}", payload.filename);
    let resp = dial_service.generate_upload_url(payload).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(resp))
}

#[instrument(skip(dial_service))]
pub async fn search_messages(
    Query(params): Query<SearchParams>,
    _tenant_id: TenantId,
    _user_id: UserId,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
) -> ApiResult<Json<SearchResults>> {
    info!("Searching messages with query: {}", params.q);
    let results = dial_service.search_messages(params).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(results))
}

#[instrument(skip(dial_service))]
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    _tenant_id: TenantId,
    _user_id: UserId,
    Extension(dial_service): Extension<Arc<dyn DialService>>,
) -> Response {
    ws.on_upgrade(|mut socket| async move {
        info!("WebSocket connected");
        // Register presence
        if let Err(e) = dial_service.register_presence().await {
            error!("Failed to register presence: {:?}", e);
            return; // close connection
        }
        while let Some(msg) = socket.recv().await {
            match msg {
                Ok(ws_msg) => {
                    if let Err(e) = socket.send(ws_msg).await {
                        error!("WebSocket send error: {:?}", e);
                        break;
                    }
                }
                Err(e) => {
                    error!("WebSocket receive error: {:?}", e);
                    break;
                }
            }
        }
        info!("WebSocket disconnected");
        if let Err(e) = dial_service.unregister_presence().await {
            error!("Failed to unregister presence: {:?}", e);
        }
    })
}

// ======================================================================
// DTOs – these should eventually move to ataqu-contracts
// ======================================================================
#[derive(Debug, Serialize, Deserialize)]
pub struct ChannelSummary {
    pub id: Uuid,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Channel {
    pub id: Uuid,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateChannelRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct MessageListParams {
    pub cursor: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct MessageListResponse {
    pub messages: Vec<Message>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct ThreadSummary {
    pub id: Uuid,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct Thread {
    pub id: Uuid,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateThreadRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UploadUrlRequest {
    pub filename: String,
    pub content_type: String,
}

#[derive(Debug, Serialize)]
pub struct UploadUrlResponse {
    pub url: String,
    pub key: String,
}

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub channel_id: Option<Uuid>,
    pub limit: Option<u32>,
    pub cursor: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SearchResults {
    pub results: Vec<Message>,
    pub total: u64,
}

// Re-export TenantId from kernel
pub fn routes() -> axum::Router<crate::AppState> {
    use axum::routing::get;
    axum::Router::new()
        .route("/", get(|| async { "Placeholder for $app" }))
}
