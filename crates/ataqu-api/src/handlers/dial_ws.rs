use axum::{
    Router,
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use tracing::info;

use crate::AppState;
use crate::error::ApiResponseError;
use crate::middleware::AuthContext;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    auth: AuthContext,
) -> Result<Response, ApiResponseError> {
    Ok(ws.on_upgrade(move |socket| handle_websocket(socket, state, auth)))
}

async fn handle_websocket(mut socket: WebSocket, state: AppState, auth: AuthContext) {
    info!("WebSocket connected for user {}", auth.user_id);
    if let Err(e) = state
        .dial_service
        .set_online(auth.tenant_id, auth.user_id)
        .await
    {
        tracing::error!("Failed to set presence: {}", e);
    }
    while let Some(Ok(msg)) = socket.recv().await {
        match msg {
            Message::Text(text) => {
                // Echo back
                if let Err(e) = socket.send(Message::Text(text)).await {
                    tracing::error!("Failed to send echo: {}", e);
                    break;
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }
    if let Err(e) = state
        .dial_service
        .set_offline(auth.tenant_id, auth.user_id)
        .await
    {
        tracing::error!("Failed to remove presence: {}", e);
    }
}

pub fn routes() -> Router<AppState> {
    use axum::routing::get;
    Router::new().route("/", get(ws_handler))
}
