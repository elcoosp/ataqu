use axum::{Router, routing::get};
use crate::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(|| async { "Placeholder for PIVOT" }))
}
