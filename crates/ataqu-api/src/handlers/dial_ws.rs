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
        &jsonwebtoken::Validation::default(),
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
        email: token_data.claims.email,
        roles: token_data.claims.roles,
    };

    Ok(ws.on_upgrade(move |socket| handle_websocket(socket, state, auth)))
}

async fn handle_websocket(socket: WebSocket, state: AppState, auth: AuthContext) {
    info!(user_id = %auth.user_id, "WebSocket connected");

    if let Err(e) = state
        .dial_service
        .set_online(auth.tenant_id, auth.user_id)
        .await
    {
        tracing::error!("Failed to set presence: {}", e);
    }

    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let connection_id = uuid::Uuid::new_v4();
    let connection_id = uuid::Uuid::new_v4();

    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

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
                                    let key = (auth.tenant_id.as_uuid(), channel_id);
                                    let entry =
                                        state.ws_registry.entry(key).or_insert_with(DashMap::new);
                                    entry.insert(connection_id, tx.clone());

                                    let _ = tx.send(
                                        serde_json::json!({
                                            "type": "subscribed",
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
                                                "created_at": msg.created_at,
                                            })
                                            .to_string();

                                            if let Some(subscribers) = state.ws_registry.get(&key) {
                                                for entry in subscribers.iter() {
                                                    if entry.key() != &connection_id {
                                                        let _ =
                                                            entry.value().send(broadcast.clone());
                                                    }
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
                                            if entry.key() != &auth.user_id {
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

    // Note: In a production system, we would maintain a reverse index
    // (user_id -> set of channel_ids) for O(1) cleanup.
    // For now, we iterate all channels but only remove the user.
    // With bounded channels per tenant, this is acceptable.
    state.ws_registry.iter().for_each(|entry| {
        entry.value().remove(&connection_id);
    });

    if let Err(e) = state
        .dial_service
        .set_offline(auth.tenant_id, auth.user_id)
        .await
    {
        tracing::error!("Failed to remove presence: {}", e);
    }

    send_task.abort();
    info!(user_id = %auth.user_id, "WebSocket disconnected");
}

pub fn routes() -> Router<AppState> {
    axum::Router::new().route("/", axum::routing::get(ws_handler))
}
