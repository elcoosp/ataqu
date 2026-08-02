pub mod error;
pub mod handlers;
pub mod middleware;
pub mod serializers;

use axum::Router;
use ataqu_application::pivot_service::PivotService;

// Placeholder services with Clone
#[derive(Clone)]
pub struct SondService;
#[derive(Clone)]
pub struct SparkService;
#[derive(Clone)]
pub struct VaultService;

#[derive(Clone)]
pub struct AppState {
    pub sond_service: SondService,
    pub spark_service: SparkService,
    pub vault_service: VaultService,
    pub pivot_service: PivotService,  // concrete type, no generics
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .nest("/api/spark", handlers::spark::spark_router())
        .nest("/api/sond", handlers::sond::router())
        .nest("/api/tempo", handlers::tempo::router())
        .nest("/api/pivot", handlers::pivot::routes())
        .with_state(state)
}
