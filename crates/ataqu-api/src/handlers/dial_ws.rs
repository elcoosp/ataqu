//! WebSocket handler for DIAL – placeholder returning 501.

use crate::AppState;
use crate::middleware::AuthContext;
use axum::{
    extract::{State, ws::WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
};

pub async fn ws_handler(
    _ws: WebSocketUpgrade,
    _state: State<AppState>,
    _auth: AuthContext,
) -> Response {
    // Not implemented – return 501
    (StatusCode::NOT_IMPLEMENTED, "WebSocket not implemented").into_response()
}

pub fn routes() -> axum::Router<AppState> {
    use axum::routing::get;
    axum::Router::new().route("/", get(ws_handler))
}
