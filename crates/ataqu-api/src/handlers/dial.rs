use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

use ataqu_application::dial_service::{
    DialService, CreateChannelCommand, SendMessageCommand,
    Channel, Message,
};
use ataqu_kernel::TenantId;
use crate::AppState;

#[derive(Debug, Serialize)]
pub struct ChannelResponse {
    pub id: Uuid,
    pub name: String,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
impl From<Channel> for ChannelResponse {
    fn from(c: Channel) -> Self {
        Self {
            id: c.id,
            name: c.name,
            created_by: c.created_by,
            created_at: c.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    pub sent_at: chrono::DateTime<chrono::Utc>,
}
impl From<Message> for MessageResponse {
    fn from(m: Message) -> Self {
        Self {
            id: m.id,
            channel_id: m.channel_id,
            sender_id: m.sender_id,
            content: m.content,
            sent_at: m.sent_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateChannelRequest {
    pub name: String,
}

pub async fn create_channel(
    State(state): State<AppState>,
    Json(payload): Json<CreateChannelRequest>,
) -> Result<(StatusCode, Json<ChannelResponse>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let created_by = Uuid::new_v4(); // In real, from auth
    let cmd = CreateChannelCommand {
        tenant_id,
        name: payload.name,
        created_by,
    };
    let channel = state.dial_service.create_channel(cmd).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok((StatusCode::CREATED, Json(channel.into())))
}

pub async fn list_channels(
    State(state): State<AppState>,
) -> Result<Json<Vec<ChannelResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let channels = state.dial_service.list_channels(tenant_id).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(channels.into_iter().map(|c| c.into()).collect()))
}

pub async fn get_channel(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ChannelResponse>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let channel = state.dial_service.get_channel(tenant_id, id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(channel.into()))
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub content: String,
}

pub async fn send_message(
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
    Json(payload): Json<SendMessageRequest>,
) -> Result<(StatusCode, Json<MessageResponse>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let sender_id = Uuid::new_v4(); // from auth
    let cmd = SendMessageCommand {
        tenant_id,
        channel_id,
        sender_id,
        content: payload.content,
    };
    let msg = state.dial_service.send_message(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(msg.into())))
}

pub async fn list_messages(
    State(state): State<AppState>,
    Path(channel_id): Path<Uuid>,
) -> Result<Json<Vec<MessageResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let msgs = state.dial_service.list_messages(tenant_id, channel_id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(msgs.into_iter().map(|m| m.into()).collect()))
}

// Stub for search, threads, mentions – we'll add later.
pub async fn search_messages() -> &'static str { "search" }

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/channels", axum::routing::post(create_channel))
        .route("/channels", axum::routing::get(list_channels))
        .route("/channels/:id", axum::routing::get(get_channel))
        .route("/channels/:id/messages", axum::routing::post(send_message))
        .route("/channels/:id/messages", axum::routing::get(list_messages))
        .route("/search", axum::routing::get(search_messages))
}
