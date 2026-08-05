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
    pub channel_type: Option<String>,
    pub participants: Option<Vec<Uuid>>,
}

pub async fn create_channel(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateChannelRequest>,
) -> ApiResult<(StatusCode, Json<ChannelResponse>)> {
    let channel_type = match payload.channel_type.as_deref().unwrap_or("public") {
        "public" => ChannelType::Public,
        "private" => ChannelType::Private,
        "dm" | "direct" | "direct_message" => ChannelType::DirectMessage,
        _ => return Err(ApiResponseError::validation("Invalid channel_type")),
    };

    let mut participants = payload.participants.unwrap_or_default();
    if !participants.contains(&auth.user_id) {
        participants.push(auth.user_id);
    }

    if channel_type == ChannelType::DirectMessage && participants.len() != 2 {
        return Err(ApiResponseError::validation(
            "Direct message channels must have exactly 2 participants",
        ));
    }

    let cmd = CreateChannelCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        channel_type,
        created_by: auth.user_id,
        participants,
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

pub async fn archive_channel(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .dial_service
        .archive_channel(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    // Broadcast archive event to WebSocket subscribers
    let key = (auth.tenant_id.as_uuid(), id);
    let broadcast = serde_json::json!({
        "type": "channel_archived",
        "channel_id": id,
    })
    .to_string();
    if let Some(subscribers) = state.ws_registry.get(&key) {
        for entry in subscribers.iter() {
            let _ = entry.value().send(broadcast.clone());
        }
    }

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct UpdateChannelRequest {
    pub name: Option<String>,
}

pub async fn update_channel(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateChannelRequest>,
) -> ApiResult<Json<ChannelResponse>> {
    let channel = state
        .dial_service
        .update_channel(auth.tenant_id, id, payload.name)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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

    // Broadcast to WebSocket subscribers
    let key = (auth.tenant_id.as_uuid(), channel_id);
    let broadcast = serde_json::json!({
        "type": "message",
        "id": msg.id.as_uuid(),
        "channel_id": msg.channel_id.as_uuid(),
        "author_id": msg.author_id.as_uuid(),
        "content": msg.content,
        "created_at": msg.created_at,
    }).to_string();
    if let Some(subscribers) = state.ws_registry.get(&key) {
        for entry in subscribers.iter() {
            if entry.key() != &auth.user_id {
                let _ = entry.value().send(broadcast.clone());
            }
        }
    }

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

#[derive(Debug, Deserialize)]
pub struct EditMessageRequest {
    pub content: String,
}

pub async fn edit_message(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<EditMessageRequest>,
) -> ApiResult<Json<MessageResponse>> {
    let edited = state
        .dial_service
        .edit_message(auth.tenant_id, message_id, auth.user_id, payload.content)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(edited.into()))
}

pub async fn delete_message(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(message_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    let is_moderator = auth.has_role("admin");
    state
        .dial_service
        .delete_message(auth.tenant_id, message_id, auth.user_id, is_moderator)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct StartThreadRequest {
    pub channel_id: Uuid,
    pub parent_message_id: Uuid,
}

pub async fn start_thread(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<StartThreadRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let cmd = StartThreadCommand {
        tenant_id: auth.tenant_id,
        channel_id: payload.channel_id,
        parent_message_id: payload.parent_message_id,
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

pub async fn list_thread_messages(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(thread_id): Path<Uuid>,
) -> ApiResult<Json<Vec<MessageResponse>>> {
    let msgs = state
        .dial_service
        .list_thread_messages(auth.tenant_id, thread_id, 100, 0)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(msgs.into_iter().map(|m| m.into()).collect()))
}

#[derive(Debug, Deserialize)]
pub struct AddMentionRequest {
    pub message_id: Uuid,
    pub user_id: Uuid,
}

pub async fn add_mention(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<AddMentionRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let mention = state
        .dial_service
        .add_mention(auth.tenant_id, payload.message_id, payload.user_id)
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

pub async fn mark_mention_read(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(mention_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .dial_service
        .mark_mention_as_read(auth.tenant_id, mention_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_online_users(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<serde_json::Value>> {
    let users = state
        .dial_service
        .get_online_users(auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(serde_json::json!({ "online_users": users })))
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

pub async fn upload_file(
    State(state): State<AppState>,
    auth: AuthContext,
    mut multipart: axum::extract::Multipart,
) -> ApiResult<Json<serde_json::Value>> {
    let _ = state;
    let _ = auth;
    while let Ok(Some(field)) = multipart.next_field().await {
        let raw_name = field.file_name().unwrap_or("upload.bin").to_string();
        let safe_name = std::path::Path::new(&raw_name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("upload.bin")
            .to_string();

        // Fix: In production, upload to S3 via presigned URLs.
        // For now, we consume the data and return a mock URL to prevent local disk access.
        let _ = field.bytes().await.map_err(|e| ApiResponseError::internal(&e.to_string()))?;

        return Ok(Json(serde_json::json!({
            "url": format!("https://s3.ataqu.com/uploads/{}_{}", auth.user_id, safe_name),
            "name": safe_name,
        })));
    }
    Err(ApiResponseError::validation("No file uploaded"))
}

#[derive(Debug, Deserialize)]
pub struct AddReactionRequest {
    pub emoji: String,
}

pub async fn add_reaction(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<AddReactionRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let reaction = state
        .dial_service
        .add_reaction(auth.tenant_id, message_id, auth.user_id, payload.emoji)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(serde_json::json!({
        "id": reaction.id,
        "message_id": reaction.message_id.as_uuid(),
        "user_id": reaction.user_id.as_uuid(),
        "emoji": reaction.emoji
    })))
}

pub async fn list_reactions(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(message_id): Path<Uuid>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let reactions = state
        .dial_service
        .list_reactions(auth.tenant_id, message_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let list = reactions
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "user_id": r.user_id.as_uuid(),
                "emoji": r.emoji
            })
        })
        .collect();
    Ok(Json(list))
}

pub async fn delete_reaction(
    State(state): State<AppState>,
    auth: AuthContext,
    Path((message_id, reaction_id)): Path<(Uuid, Uuid)>,
) -> ApiResult<StatusCode> {
    state
        .dial_service
        .delete_reaction(auth.tenant_id, message_id, reaction_id)
        .await
        .map_err(|e| match e {
            ataqu_application::dial_service::DialServiceError::Validation(msg) => ApiResponseError::validation(&msg),
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    use axum::routing::{get, post, put};
    Router::new()
        .route("/channels", post(create_channel).get(list_channels))
        .route(
            "/channels/:id",
            get(get_channel).delete(archive_channel).put(update_channel),
        )
        .route(
            "/channels/:id/messages",
            post(send_message).get(list_messages),
        )
        .route("/messages/:id", put(edit_message).delete(delete_message))
        .route(
            "/messages/:id/reactions",
            post(add_reaction).get(list_reactions),
        )
        .route(
            "/messages/:id/reactions/:reaction_id",
            axum::routing::delete(delete_reaction),
        )
        .route("/threads", post(start_thread))
        .route("/threads/:id", get(get_thread))
        .route("/threads/:id/messages", get(list_thread_messages))
        .route("/mentions", post(add_mention).get(list_mentions))
        .route("/mentions/:id/read", post(mark_mention_read))
        .route("/presence/online", get(get_online_users))
        .route("/search", get(search_messages))
        .route("/files", post(upload_file))
        .nest("/ws", super::dial_ws::routes())
}
