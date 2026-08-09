use axum::{
    Router,
    extract::{
        Query, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use dashmap::DashMap;
use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::info;

use crate::AppState;
use crate::error::ApiResponseError;
use crate::middleware::AuthContext;

pub type ConnectionRegistry =
    Arc<DashMap<(uuid::Uuid, uuid::Uuid), DashMap<uuid::Uuid, mpsc::UnboundedSender<String>>>>;

pub type ConnectionIndex = Arc<DashMap<uuid::Uuid, Vec<(uuid::Uuid, uuid::Uuid)>>>;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Response, ApiResponseError> {
    let token = params
        .get("token")
        .ok_or_else(|| ApiResponseError::unauthorized("Missing token query parameter"))?;

    let token_data = jsonwebtoken::decode::<crate::middleware::auth::JwtClaims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(&state.jwt_secret),
        &{
            let mut v = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256);
            v.validate_exp = true;
            v
        },
    )
    .map_err(|_| ApiResponseError::unauthorized("Invalid token"))?;

    if token_data.claims.token_type != "access" {
        return Err(ApiResponseError::unauthorized("Invalid token type"));
    }

    let user_id = uuid::Uuid::parse_str(&token_data.claims.sub)
        .map_err(|_| ApiResponseError::unauthorized("Invalid user ID in token"))?;

    let auth = crate::middleware::AuthContext {
        user_id,
        tenant_id: ataqu_kernel::TenantId::new(token_data.claims.tenant_id),
        email: ataqu_security::Email::new(token_data.claims.email),
        roles: token_data.claims.roles,
    };

    Ok(ws.on_upgrade(move |socket| handle_websocket(socket, state, auth)))
}

async fn handle_websocket(socket: WebSocket, state: AppState, auth: AuthContext) {
    info!(user_id = %auth.user_id, "WebSocket connected");

    // Presence tracking: increment count
    let count = state
        .presence_counts
        .entry(auth.user_id)
        .or_insert_with(|| std::sync::atomic::AtomicUsize::new(0));
    let prev_count = count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    if prev_count == 0 {
        if let Err(e) = state
            .dial_service
            .set_online(auth.tenant_id, auth.user_id)
            .await
        {
            tracing::error!("Failed to set presence: {}", e);
        }
    }

    struct AbortOnDrop(Option<tokio::task::JoinHandle<()>>);
    impl Drop for AbortOnDrop {
        fn drop(&mut self) {
            if let Some(handle) = self.0.take() {
                handle.abort();
            }
        }
    }

    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let connection_id = uuid::Uuid::new_v4();

    let _send_task = AbortOnDrop(Some(tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    })));

    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                    if let Some(action) = parsed.get("action").and_then(|v| v.as_str()) {
                        match action {
                            "subscribe" => {
                                if let Some(channel_id) = parsed
                                    .get("channel_id")
                                    .and_then(|v| v.as_str())
                                    .and_then(|s| uuid::Uuid::parse_str(s).ok())
                                {
                                    // [VULN-001] Verify user is a participant before subscribing
                                    if state
                                        .dial_service
                                        .get_channel(auth.tenant_id, channel_id, auth.user_id)
                                        .await
                                        .is_err()
                                    {
                                        let _ = tx.send(
                                            serde_json::json!({
                                                "type": "error",
                                                "message": "Not authorized to subscribe to this channel"
                                            })
                                            .to_string(),
                                        );
                                        continue;
                                    }

                                    let key = (auth.tenant_id.as_uuid(), channel_id);
                                    let entry = state.ws_registry.entry(key).or_default();
                                    entry.insert(connection_id, tx.clone());
                                    state.conn_index.entry(connection_id).or_default().push(key);

                                    let _ = tx.send(
                                        serde_json::json!({
                                            "type": "subscribed",
                                            "channel_id": channel_id
                                        })
                                        .to_string(),
                                    );
                                }
                            }
                            "unsubscribe" => {
                                if let Some(channel_id) = parsed
                                    .get("channel_id")
                                    .and_then(|v| v.as_str())
                                    .and_then(|s| uuid::Uuid::parse_str(s).ok())
                                {
                                    let key = (auth.tenant_id.as_uuid(), channel_id);
                                    if let Some(subscribers) = state.ws_registry.get(&key) {
                                        subscribers.remove(&connection_id);
                                    }
                                    if let Some(mut channels) =
                                        state.conn_index.get_mut(&connection_id)
                                    {
                                        channels.retain(|&k| k != key);
                                    }
                                    let _ = tx.send(
                                        serde_json::json!({
                                            "type": "unsubscribed",
                                            "channel_id": channel_id
                                        })
                                        .to_string(),
                                    );
                                }
                            }
                            "message" => {
                                if let (Some(channel_id), Some(content)) = (
                                    parsed
                                        .get("channel_id")
                                        .and_then(|v| v.as_str())
                                        .and_then(|s| uuid::Uuid::parse_str(s).ok()),
                                    parsed.get("content").and_then(|v| v.as_str()),
                                ) {
                                    let cmd = ataqu_application::dial_service::SendMessageCommand {
                                        tenant_id: auth.tenant_id,
                                        channel_id,
                                        thread_id: parsed
                                            .get("thread_id")
                                            .and_then(|v| v.as_str())
                                            .and_then(|s| uuid::Uuid::parse_str(s).ok()),
                                        author_id: auth.user_id,
                                        content: content.to_string(),
                                    };
                                    match state.dial_service.send_message(cmd).await {
                                        Ok(msg) => {
                                            let key = (auth.tenant_id.as_uuid(), channel_id);
                                            let broadcast = serde_json::json!({
                                                "type": "message",
                                                "id": msg.id.as_uuid(),
                                                "channel_id": msg.channel_id.as_uuid(),
                                                "author_id": msg.author_id.as_uuid(),
                                                "content": msg.content,
                                                "created_at": chrono::DateTime::<chrono::Utc>::from(msg.created_at).to_rfc3339(),
                                            })
                                            .to_string();

                                            if let Some(subscribers) = state.ws_registry.get(&key) {
                                                for entry in subscribers.iter() {
                                                    let _ = entry.value().send(broadcast.clone());
                                                }
                                            }
                                        }
                                        Err(e) => {
                                            let _ = tx.send(
                                                serde_json::json!({
                                                    "type": "error",
                                                    "message": e.to_string()
                                                })
                                                .to_string(),
                                            );
                                        }
                                    }
                                }
                            }
                            "typing" => {
                                if let Some(channel_id) = parsed
                                    .get("channel_id")
                                    .and_then(|v| v.as_str())
                                    .and_then(|s| uuid::Uuid::parse_str(s).ok())
                                {
                                    let key = (auth.tenant_id.as_uuid(), channel_id);
                                    let broadcast = serde_json::json!({
                                        "type": "typing",
                                        "channel_id": channel_id,
                                        "user_id": auth.user_id,
                                    })
                                    .to_string();
                                    if let Some(subscribers) = state.ws_registry.get(&key) {
                                        for entry in subscribers.iter() {
                                            if entry.key() != &connection_id {
                                                let _ = entry.value().send(broadcast.clone());
                                            }
                                        }
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    if let Some(channels) = state.conn_index.get(&connection_id) {
        for key in channels.iter() {
            if let Some(subscribers) = state.ws_registry.get(key) {
                subscribers.remove(&connection_id);
            }
        }
    }
    state.conn_index.remove(&connection_id);

    // Presence tracking: decrement count
    if let Some(count) = state.presence_counts.get(&auth.user_id) {
        let new_count = count.fetch_sub(1, std::sync::atomic::Ordering::SeqCst) - 1;
        if new_count == 0 {
            drop(count);
            state.presence_counts.remove(&auth.user_id);
            if let Err(e) = state
                .dial_service
                .set_offline(auth.tenant_id, auth.user_id)
                .await
            {
                tracing::error!("Failed to remove presence: {}", e);
            }
        }
    }

    // _send_task is aborted automatically via AbortOnDrop Drop impl
    info!(user_id = %auth.user_id, "WebSocket disconnected");
}

pub fn routes() -> Router<AppState> {
    axum::Router::new().route("/", axum::routing::get(ws_handler))
}
