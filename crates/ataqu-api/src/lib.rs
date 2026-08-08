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
    pub db: sea_orm::DatabaseConnection,
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
    pub conn_index: handlers::dial_ws::ConnectionIndex,
    pub presence_counts: Arc<dashmap::DashMap<uuid::Uuid, std::sync::atomic::AtomicUsize>>,
    pub email_tracking_tx:
        tokio::sync::mpsc::Sender<ataqu_infra_repositories::email_tracking_writer::TrackingEvent>,
    pub rate_limiter: RateLimiter,
    pub metrics_handle: PrometheusHandle,
    pub sso_states: Arc<moka::sync::Cache<String, ataqu_domain_aegis::sso::SsoProvider>>,
    pub jwt_blocklist: Arc<moka::sync::Cache<String, ()>>,
    pub http_client: reqwest::Client,
}

async fn request_id_middleware(mut req: Request, next: Next) -> Response {
    let request_id = Uuid::now_v7().to_string();
    req.extensions_mut().insert(request_id.clone());
    let method = req.method().to_string();
    let matched_path = req
        .extensions()
        .get::<axum::extract::MatchedPath>()
        .map(|p| p.as_str().split('/').take(3).collect::<Vec<_>>().join("/"))
        .unwrap_or_else(|| "unknown".to_string());
    let mut resp = next.run(req).await;
    resp.headers_mut()
        .insert("x-request-id", request_id.parse().unwrap());
    metrics::counter!("ataqu_http_requests_total", "method" => method, "path" => matched_path)
        .increment(1);
    resp
}

async fn health_check() -> impl axum::response::IntoResponse {
    axum::Json(serde_json::json!({
        "status": "nominal",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn metrics_handler(State(state): State<AppState>) -> String {
    state.metrics_handle.render()
}

async fn readiness_check(State(state): State<AppState>) -> impl axum::response::IntoResponse {
    // ADR-034: Check critical background tasks and DB connectivity
    if state.email_tracking_tx.is_closed() {
        return (
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            "email tracking channel closed",
        );
    }

    // Check DB connection by executing a simple query
    use sea_orm::ConnectionTrait;
    match state.db.execute_raw(sea_orm::Statement::from_string(
        sea_orm::DbBackend::Postgres,
        "SELECT 1",
    )).await {
        Ok(_) => (axum::http::StatusCode::OK, "ready"),
        Err(e) => {
            tracing::error!(error = %e, "Readiness check DB query failed");
            (axum::http::StatusCode::SERVICE_UNAVAILABLE, "database unavailable")
        }
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

    let public_routes = Router::new()
        .nest("/api/sond", handlers::sond::public_routes())
        .nest("/api/tempo", handlers::tempo::public_routes())
        .nest("/api/cinq", handlers::cinq::public_routes())
        .nest("/api/spark", handlers::spark::public_routes())
        .layer(axum::middleware::from_fn(request_id_middleware))
        .layer(axum::middleware::from_fn(
            crate::middleware::idempotency::idempotency_middleware,
        ))
        .layer(axum::middleware::from_fn(
            crate::middleware::etag::etag_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.rate_limiter.clone(),
            crate::middleware::rate_limit::rate_limit_middleware,
        ));

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
        .nest("/api/gdpr", handlers::gdpr::routes())
        .route(
            "/api/search",
            axum::routing::get(handlers::search::unified_search),
        )
        .route("/metrics", axum::routing::get(metrics_handler))
        .layer(axum::middleware::from_fn(request_id_middleware))
        .layer(axum::middleware::from_fn(
            crate::middleware::idempotency::idempotency_middleware,
        ))
        .layer(axum::middleware::from_fn(
            crate::middleware::csrf::csrf_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.rate_limiter.clone(),
            crate::middleware::rate_limit::rate_limit_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::auth_middleware,
        ));

    let track_router = Router::new()
        .route(
            "/track",
            axum::routing::get(handlers::email_tracking::track_email_public),
        )
        .layer(axum::middleware::from_fn(request_id_middleware))
        .with_state(state.clone());

    let default_router = Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/ready", axum::routing::get(readiness_check))
        .merge(public_routes)
        .merge(private_routes)
        .with_state(state);

    Router::new()
        .fallback(|headers: axum::http::HeaderMap, req: Request| async move {
            use tower::ServiceExt;
            let is_track = headers
                .get(axum::http::header::HOST)
                .and_then(|v| v.to_str().ok())
                .map(|h| h.starts_with("track."))
                .unwrap_or(false);

            if is_track {
                track_router.oneshot(req).await
            } else {
                default_router.oneshot(req).await
            }
        })
        .with_state(())
}
