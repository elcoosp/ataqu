use axum::{Router, routing::{get, post}};
use crate::AppState;

pub async fn list_workflows() -> &'static str { "workflows" }
pub async fn create_workflow() -> &'static str { "create workflow" }
pub async fn execute_workflow() -> &'static str { "execute" }

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/workflows", get(list_workflows).post(create_workflow))
        .route("/execute", post(execute_workflow))
}
