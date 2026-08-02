pub mod error;
pub mod handlers {
    pub mod dial;
    pub mod sond;
    pub mod spark;
}

use ataqu_application::sond_service::SondService;
use ataqu_application::spark_service::SparkService;
use axum::Router;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub spark_service: Arc<SparkService>,
    pub sond_service: Arc<SondService>,
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .nest("/api/spark", handlers::spark::spark_router())
        .nest("/api/sond", handlers::sond::router())
        .with_state(state)
}
