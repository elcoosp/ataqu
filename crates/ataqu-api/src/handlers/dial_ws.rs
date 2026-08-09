//! WebSocket handler for DIAL – placeholder to allow compilation.
use axum::extract::ws::{WebSocket, WebSocketUpgrade};
use axum::response::Response;
use std::sync::Arc;
use crate::AppState;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    state: Arc<AppState>,
    auth: crate::middleware::AuthContext,
) -> Response {
    ws.on_upgrade(|_socket| async move {
        // TODO: implement WebSocket handling
        println!("WebSocket connected");
    })
}

pub fn routes() -> axum::Router<AppState> {
    use axum::routing::get;
    axum::Router::new().route("/", get(ws_handler))
}
