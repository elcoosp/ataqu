use axum::{Router, routing::{get, post}};
use crate::AppState;

pub async fn list_channels() -> &'static str { "channels" }
pub async fn create_channel() -> &'static str { "create channel" }
pub async fn send_message() -> &'static str { "send message" }

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/channels", get(list_channels).post(create_channel))
        .route("/messages", post(send_message))
}
