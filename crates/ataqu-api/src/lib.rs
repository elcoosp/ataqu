//! Ataqu API - unified HTTP server for all 10 apps.

pub mod error;
pub mod handlers;
pub mod middleware;
pub mod serializers;

use axum::Router;
use std::sync::Arc;

// Import all application services.
use ataqu_application::aegis_service::AegisService;
use ataqu_application::cinq_service::CinqService;
use ataqu_application::dial_service::DialService;
use ataqu_application::pause_service::PauseService;
use ataqu_application::pivot_service::PivotService;
use ataqu_application::sond_service::SondService;
use ataqu_application::spark_service::SparkService;
use ataqu_application::tempo_service::TempoService;
use ataqu_application::vault_service::VaultService;
use ataqu_application::vista_service::VistaService;

// For now, use placeholder generics; in production, we'll use real repositories.
// We'll create a unified AppState.
#[derive(Clone)]
pub struct AppState {
    pub aegis_service: Arc<AegisService<(), (), ()>>,  // Placeholder generics
    pub cinq_service: Arc<CinqService<(), (), (), (), ()>>,
    pub dial_service: Arc<DialService>,
    pub pause_service: Arc<PauseService>,
    pub pivot_service: Arc<PivotService>,
    pub sond_service: Arc<SondService>,
    pub spark_service: Arc<SparkService>,
    pub tempo_service: Arc<TempoService<(), (), (), ()>>,
    pub vault_service: Arc<VaultService>,
    pub vista_service: Arc<VistaService>,
}

// Helper to create a router with all app routes.
pub fn create_router(state: AppState) -> Router {
    use handlers::aegis::routes as aegis_routes;
    use handlers::cinq::cinq_routes;
    use handlers::dial::routes as dial_routes;
    use handlers::pause::routes as pause_routes;
    use handlers::pivot::routes as pivot_routes;
    use handlers::sond::routes as sond_routes;
    use handlers::spark::routes as spark_routes;
    use handlers::tempo::routes as tempo_routes;
    use handlers::vault::routes as vault_routes;
    use handlers::vista::routes as vista_routes;

    Router::new()
        .nest("/api/aegis", aegis_routes())
        .nest("/api/cinq", cinq_routes())
        .nest("/api/dial", dial_routes())
        .nest("/api/pause", pause_routes())
        .nest("/api/pivot", pivot_routes())
        .nest("/api/sond", sond_routes())
        .nest("/api/spark", spark_routes())
        .nest("/api/tempo", tempo_routes())
        .nest("/api/vault", vault_routes())
        .nest("/api/vista", vista_routes())
        .with_state(state)
}
