//! Ataqu API - unified HTTP server for all 10 apps.

pub mod error;
pub mod handlers;
pub mod middleware;
pub mod serializers;

use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

use crate::middleware::rate_limit::RateLimiter;
use axum::Router;
use axum::extract::State;
use metrics_exporter_prometheus::PrometheusHandle;
use std::sync::Arc;
use uuid::Uuid;

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
use ataqu_kernel::{Clock, IdGenerator};

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
    pub aegis_service: Arc<AegisService>,
    pub pause_service: Arc<PauseService>,
    pub jwt_secret: Arc<Vec<u8>>,
    pub id_gen: Arc<dyn IdGenerator>,
    pub clock: Arc<dyn Clock>,
    pub ws_registry: handlers::dial_ws::ConnectionRegistry,
    pub email_tracking_tx:
        tokio::sync::mpsc::Sender<ataqu_infra_repositories::email_tracking_writer::TrackingEvent>,
    pub rate_limiter: RateLimiter,
    pub metrics_handle: PrometheusHandle,
}

async fn request_id_middleware(mut req: Request, next: Next) -> Response {
    let request_id = Uuid::new_v4().to_string();
    req.extensions_mut().insert(request_id.clone());
    let method = req.method().to_string();
    let path = req.uri().path().to_string();
    let mut resp = next.run(req).await;
    resp.headers_mut()
        .insert("x-request-id", request_id.parse().unwrap());
    metrics::counter!("ataqu_http_requests_total", "method" => method, "path" => path).increment(1);
    resp
}

async fn health_check() -> &'static str {
    "ok"
}

async fn metrics_handler(State(state): State<AppState>) -> String {
    state.metrics_handle.render()
}

async fn readiness_check(State(state): State<AppState>) -> impl axum::response::IntoResponse {
    match state
        .cinq_service
        .list_contacts(ataqu_kernel::TenantId::new(uuid::Uuid::nil()), 1, 0)
        .await
    {
        Ok(_) => (axum::http::StatusCode::OK, "ready"),
        Err(_) => (axum::http::StatusCode::SERVICE_UNAVAILABLE, "not ready"),
    }
}

pub fn create_router(state: AppState) -> Router {
    use handlers::aegis::routes as aegis_routes;
    use handlers::cinq::routes as cinq_routes;
    use handlers::dial::routes as dial_routes;
    use handlers::pause::routes as pause_routes;
    use handlers::pivot::routes as pivot_routes;
    use handlers::sond::routes as sond_routes;
    use handlers::spark::routes as spark_routes;
    use handlers::tempo::routes as tempo_routes;
    use handlers::vault::routes as vault_routes;
    use handlers::vista::routes as vista_routes;

    // Public routes (no auth required)
    let public_routes = Router::new()
        .nest("/api/sond", handlers::sond::public_routes())
        .nest("/api/tempo", handlers::tempo::public_routes())
        .nest("/api/cinq", handlers::cinq::public_routes())
        .nest("/api/spark", handlers::spark::public_routes())
        .layer(axum::middleware::from_fn(request_id_middleware))
        .layer(axum::middleware::from_fn(
            crate::middleware::idempotency::idempotency_middleware,
        ))
        .layer(axum::middleware::from_fn(crate::middleware::etag::etag_middleware))
        .layer(axum::middleware::from_fn_with_state(
            state.rate_limiter.clone(),
            crate::middleware::rate_limit::rate_limit_middleware,
        ));

    // Private routes (auth required)
    let private_routes = Router::new()
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
        .layer(axum::middleware::from_fn(request_id_middleware))
        .layer(axum::middleware::from_fn(
            crate::middleware::idempotency::idempotency_middleware,
        ))
        .layer(axum::middleware::from_fn(crate::middleware::etag::etag_middleware))
        .layer(axum::middleware::from_fn_with_state(
            state.rate_limiter.clone(),
            crate::middleware::rate_limit::rate_limit_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::auth_middleware,
        ));

    Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/metrics", axum::routing::get(metrics_handler))
        .route("/ready", axum::routing::get(readiness_check))
        .merge(public_routes)
        .merge(private_routes)
        .with_state(state)
}
