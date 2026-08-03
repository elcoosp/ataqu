use axum::{Router, routing::get};
use crate::AppState;

pub async fn list_docs() -> &'static str { "documents" }
pub async fn create_doc() -> &'static str { "create doc" }

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/docs", get(list_docs).post(create_doc))
}
