//! Ataqu API - unified HTTP server for all 10 apps.

pub mod error;
pub mod handlers;
pub mod middleware;
pub mod serializers;

use axum::middleware::Next;
use axum::extract::Request;
use axum::response::Response;

use axum::Router;
use axum::extract::State;
use crate::middleware::rate_limit::RateLimiter;
use uuid::Uuid;
use std::sync::Arc;

use ataqu_application::aegis_service::{AegisService, OutboxAppender};
use ataqu_application::cinq_service::CinqService;
use ataqu_application::dial_service::DialService;
use ataqu_application::pause_service::PauseService;
use ataqu_application::pivot_service::PivotService;
use ataqu_application::sond_service::SondService;
use ataqu_application::spark_service::SparkService;
use ataqu_application::tempo_service::TempoService;
use ataqu_application::vault_service::VaultService;
use ataqu_application::vista_service::VistaService;
use ataqu_kernel::{Clock, IdGenerator};

pub struct SystemIdGenerator;
impl IdGenerator for SystemIdGenerator {
    fn new_uuid_v7(&self) -> Uuid {
        Uuid::now_v7()
    }
}

pub struct SystemClock;
impl Clock for SystemClock {
    fn now(&self) -> std::time::SystemTime {
        std::time::SystemTime::now()
    }
}

#[derive(Clone)]
pub struct OutboxPlaceholder;
#[async_trait::async_trait]
impl OutboxAppender for OutboxPlaceholder {
    async fn append_event(
        &self,
        _event: &serde_json::Value,
    ) -> Result<(), String> {
        Ok(())
    }
}

#[derive(Clone)]
pub struct AppState {
    pub cinq_service: Arc<CinqService>,
    pub dial_service: Arc<DialService>,
    pub pivot_service: Arc<PivotService>,
    pub sond_service: Arc<SondService>,
    pub spark_service: Arc<SparkService>,
    pub tempo_service: Arc<TempoService>,
    pub vault_service: Arc<VaultService>,
    pub vista_service: Arc<VistaService>,
    pub aegis_service: Arc<AegisService<OutboxPlaceholder>>,
    pub pause_service: Arc<PauseService>,
    pub jwt_secret: Arc<Vec<u8>>,
    pub id_gen: Arc<dyn IdGenerator>,
    pub clock: Arc<dyn Clock>,
    pub ws_registry: handlers::dial_ws::ConnectionRegistry,
    pub email_tracking_tx: tokio::sync::mpsc::Sender<ataqu_infra_repositories::email_tracking_writer::TrackingEvent>,
    pub rate_limiter: RateLimiter,
}

async fn request_id_middleware(mut req: Request, next: Next) -> Response {
    let request_id = Uuid::new_v4().to_string();
    req.extensions_mut().insert(request_id.clone());
    let mut resp = next.run(req).await;
    resp.headers_mut().insert("x-request-id", request_id.parse().unwrap());
    resp
}

async fn health_check() -> &'static str {
    "ok"
}

async fn readiness_check(State(state): State<AppState>) -> impl axum::response::IntoResponse {
    match state.cinq_service.list_contacts(ataqu_kernel::TenantId::new(uuid::Uuid::nil()), 1, 0).await {
        Ok(_) => (axum::http::StatusCode::OK, "ready"),
        Err(_) => (axum::http::StatusCode::SERVICE_UNAVAILABLE, "not ready"),
    }
}

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
        .route("/health", axum::routing::get(health_check))
        .route("/ready", axum::routing::get(readiness_check))
        .layer(axum::middleware::from_fn(request_id_middleware))
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
