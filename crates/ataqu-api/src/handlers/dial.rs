use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_application::dial_service::{
    CreateChannelCommand, SendMessageCommand, StartThreadCommand,
};
use ataqu_domain_dial::chat::ChannelType;

#[derive(Debug, Serialize)]
pub struct ChannelResponse {
    pub id: Uuid,
    pub name: String,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
}

impl From<ataqu_application::dial_service::Channel> for ChannelResponse {
    fn from(c: ataqu_application::dial_service::Channel) -> Self {
        Self {
            id: c.id.as_uuid(),
            name: c.name,
            created_by: c.created_by.as_uuid(),
            created_at: DateTime::<Utc>::from(c.created_at),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub author_id: Uuid,
    pub content: String,
    pub sent_at: DateTime<Utc>,
}

impl From<ataqu_application::dial_service::Message> for MessageResponse {
    fn from(m: ataqu_application::dial_service::Message) -> Self {
        Self {
            id: m.id.as_uuid(),
            channel_id: m.channel_id.as_uuid(),
            author_id: m.author_id.as_uuid(),
            content: m.content,
            sent_at: DateTime::<Utc>::from(m.created_at),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateChannelRequest {
    pub name: String,
}

pub async fn create_channel(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateChannelRequest>,
) -> ApiResult<(StatusCode, Json<ChannelResponse>)> {
    let cmd = CreateChannelCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        channel_type: ChannelType::Public,
        created_by: auth.user_id,
        participants: vec![],
    };
    let channel = state
        .dial_service
        .create_channel(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(channel.into())))
}

pub async fn list_channels(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<ChannelResponse>>> {
    let channels = state
        .dial_service
        .list_channels(auth.tenant_id, 100, 0)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(channels.into_iter().map(|c| c.into()).collect()))
}

pub async fn get_channel(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<ChannelResponse>> {
    let channel = state
        .dial_service
        .get_channel(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(channel.into()))
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub content: String,
}

pub async fn send_message(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(channel_id): Path<Uuid>,
    Json(payload): Json<SendMessageRequest>,
) -> ApiResult<(StatusCode, Json<MessageResponse>)> {
    let cmd = SendMessageCommand {
        tenant_id: auth.tenant_id,
        channel_id,
        thread_id: None,
        author_id: auth.user_id,
        content: payload.content,
    };
    let msg = state
        .dial_service
        .send_message(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(msg.into())))
}

pub async fn list_messages(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(channel_id): Path<Uuid>,
) -> ApiResult<Json<Vec<MessageResponse>>> {
    let msgs = state
        .dial_service
        .list_messages(auth.tenant_id, channel_id, 100, 0)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(msgs.into_iter().map(|m| m.into()).collect()))
}

pub async fn start_thread(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<serde_json::Value>,
) -> ApiResult<Json<serde_json::Value>> {
    let channel_id = payload
        .get("channel_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| ApiResponseError::validation("channel_id required as UUID"))?;
    let parent_message_id = payload
        .get("parent_message_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| ApiResponseError::validation("parent_message_id required as UUID"))?;
    let cmd = StartThreadCommand {
        tenant_id: auth.tenant_id,
        channel_id,
        parent_message_id,
    };
    let thread = state
        .dial_service
        .start_thread(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(serde_json::json!({
        "id": thread.id,
        "channel_id": thread.channel_id,
        "parent_message_id": thread.parent_message_id,
        "created_at": thread.created_at,
    })))
}

pub async fn get_thread(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<serde_json::Value>> {
    let thread = state
        .dial_service
        .get_thread(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(serde_json::json!({
        "id": thread.id,
        "channel_id": thread.channel_id,
        "parent_message_id": thread.parent_message_id,
        "created_at": thread.created_at,
    })))
}

pub async fn add_mention(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<serde_json::Value>,
) -> ApiResult<Json<serde_json::Value>> {
    let message_id = payload
        .get("message_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| ApiResponseError::validation("message_id required"))?;
    let user_id = payload
        .get("user_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| ApiResponseError::validation("user_id required"))?;
    let mention = state
        .dial_service
        .add_mention(auth.tenant_id, message_id, user_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(serde_json::json!({
        "id": mention.id,
        "message_id": mention.message_id,
        "user_id": mention.user_id,
        "read_at": mention.read_at,
    })))
}

pub async fn list_mentions(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<serde_json::Value>> {
    let mentions = state
        .dial_service
        .list_mentions(auth.tenant_id, auth.user_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let list: Vec<_> = mentions
        .into_iter()
        .map(|m| {
            serde_json::json!({
                "id": m.id,
                "message_id": m.message_id,
                "user_id": m.user_id,
                "read_at": m.read_at,
            })
        })
        .collect();
    Ok(Json(serde_json::json!({ "mentions": list })))
}

pub async fn search_messages(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResult<Json<serde_json::Value>> {
    let query = params
        .get("q")
        .ok_or_else(|| ApiResponseError::validation("q parameter required"))?;
    let limit: u64 = params
        .get("limit")
        .and_then(|s| s.parse().ok())
        .unwrap_or(100);
    let offset: u64 = params
        .get("offset")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let messages = state
        .dial_service
        .search_messages(auth.tenant_id, query, limit, offset)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let list: Vec<MessageResponse> = messages.into_iter().map(MessageResponse::from).collect();
    Ok(Json(serde_json::json!({ "messages": list })))
}

pub fn routes() -> Router<AppState> {
    use axum::routing::{get, post};
    Router::new()
        .route("/channels", post(create_channel).get(list_channels))
        .route("/channels/:id", get(get_channel))
        .route(
            "/channels/:id/messages",
            post(send_message).get(list_messages),
        )
        .route("/threads", post(start_thread))
        .route("/threads/:id", get(get_thread))
        .route("/mentions", post(add_mention).get(list_mentions))
        .route("/search", get(search_messages))
        .nest("/ws", super::dial_ws::routes())
}
