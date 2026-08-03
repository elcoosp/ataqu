use axum::{Router, routing::{get, post}};
use crate::AppState;

pub async fn list_forms() -> &'static str { "forms" }
pub async fn create_form() -> &'static str { "create form" }
pub async fn submit_form() -> &'static str { "submit" }

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/forms", get(list_forms).post(create_form))
        .route("/submit", post(submit_form))
}
