pub mod error;
pub mod handlers;
pub mod middleware;
pub mod serializers;

use axum::Router;

#[derive(Clone)]
pub struct AppState {
    // Services will be injected here
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .nest("/api/spark", handlers::spark::spark_router())
        .nest("/api/sond", handlers::sond::router())
        .nest("/api/tempo", handlers::tempo::router())
        .with_state(state)
}
