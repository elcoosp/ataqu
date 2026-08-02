use ataqu_application::spark_service::SparkService;
use axum::Router;
use std::sync::Arc;

pub mod handlers;

#[derive(Clone)]
pub struct AppState {
    pub spark_service: Arc<SparkService>,
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .nest("/api/spark", handlers::spark::spark_router())
        .with_state(state)
}
