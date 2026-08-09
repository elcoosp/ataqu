//! WebSocket handler for DIAL – placeholder returning 501.

use axum::{
    extract::{ws::WebSocketUpgrade, State},
    response::{IntoResponse, Response},
    http::StatusCode,
};
use std::sync::Arc;
use crate::AppState;
use crate::middleware::AuthContext;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    state: State<Arc<AppState>>,
    auth: AuthContext,
) -> Response {
    // Not implemented – return 501
    (StatusCode::NOT_IMPLEMENTED, "WebSocket not implemented").into_response()
}

pub fn routes() -> axum::Router<AppState> {
    use axum::routing::get;
    axum::Router::new().route("/", get(ws_handler))
}
