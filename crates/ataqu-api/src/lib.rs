// ===== FILE: ataqu-api/src/lib.rs =====

//! Ataqu API layer – Axum handlers, middleware, and shared state.

use axum::{
    Router,
    extract::State,
    routing::{get, post},
};
use dashmap::DashMap;
use metrics_exporter_prometheus::PrometheusHandle;
use moka::sync::Cache;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio::sync::mpsc::Sender;
use uuid::Uuid;

use crate::middleware::rate_limit::RateLimiter;
use ataqu_application::pause_service::IdempotencyPort;
use ataqu_application::{
    aegis_service::AegisService, cinq_service::CinqService, dial_service::DialService,
    pause_service::PauseService, pivot_service::PivotService, sond_service::SondService,
    spark_service::SparkService, tempo_service::TempoService, vault_service::VaultService,
    vista_service::VistaService,
};
use ataqu_infra_repositories::email_tracking_writer::TrackingEvent;
use ataqu_kernel::{Clock, IdGenerator};

pub mod error;
pub mod handlers;
pub mod middleware;
pub mod serializers;

pub use ataqu_infra_storage::s3_service::S3Service;

// Type aliases matching the handler expectations
pub type WsRegistry =
    Arc<DashMap<(Uuid, Uuid), Arc<DashMap<Uuid, tokio::sync::mpsc::UnboundedSender<String>>>>>;
pub type ConnIndex = Arc<DashMap<Uuid, Vec<(Uuid, Uuid)>>>;
pub type PresenceCounts = Arc<DashMap<Uuid, std::sync::atomic::AtomicUsize>>;
pub type SsoStates = Arc<Cache<String, String>>;

/// Application state shared across handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
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
    pub id_gen: Arc<dyn IdGenerator + Send + Sync>,
    pub clock: Arc<dyn Clock + Send + Sync>,
    pub ws_registry: WsRegistry,
    pub conn_index: ConnIndex,
    pub presence_counts: PresenceCounts,
    pub email_tracking_tx: Sender<TrackingEvent>,
    pub rate_limiter: RateLimiter,
    pub metrics_handle: PrometheusHandle,
    pub sso_states: SsoStates,
    pub http_client: reqwest::Client,
    pub health_service: Arc<ataqu_application::health_service::HealthService>,
    pub health_cache: Arc<moka::sync::Cache<String, serde_json::Value>>,
    pub audit_repo: Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>,
    pub s3_service: Arc<S3Service>,
    pub idempotency_guard: Arc<dyn IdempotencyPort + Send + Sync>,
    pub onboarding_service: Arc<ataqu_application::onboarding_service::OnboardingService>,
    pub changelog_service: Arc<ataqu_application::changelog_service::ChangelogService>,
}

async fn security_headers_middleware(
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let mut resp = next.run(req).await;
    let headers = resp.headers_mut();
    headers.insert("x-content-type-options", "nosniff".parse().unwrap());
    headers.insert("x-frame-options", "DENY".parse().unwrap());
    headers.insert(
        "content-security-policy",
        "default-src 'self'".parse().unwrap(),
    );
    headers.insert(
        "referrer-policy",
        "strict-origin-when-cross-origin".parse().unwrap(),
    );
    resp
}

async fn request_id_middleware(
    mut req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let request_id = Uuid::now_v7().to_string();
    req.extensions_mut().insert(request_id.clone());
    let method = req.method().to_string();
    let matched_path = req
        .extensions()
        .get::<axum::extract::MatchedPath>()
        .map(|p| p.as_str().to_string())
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
    if state.email_tracking_tx.is_closed() {
        return (
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            "email tracking channel closed",
        );
    }

    use sea_orm::ConnectionTrait;
    match state
        .db
        .execute_raw(sea_orm::Statement::from_string(
            sea_orm::DbBackend::Postgres,
            "SELECT 1",
        ))
        .await
    {
        Ok(_) => (axum::http::StatusCode::OK, "ready"),
        Err(e) => {
            tracing::error!(error = %e, "Readiness check DB query failed");
            (
                axum::http::StatusCode::SERVICE_UNAVAILABLE,
                "database unavailable",
            )
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
        .nest("/api/aegis", handlers::aegis::public_routes())
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
        .route("/admin/health", axum::routing::get(health_check))
        .route(
            "/api/v1/health/status",
            axum::routing::get(handlers::health::get_health_status),
        )
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
        .layer(axum::middleware::from_fn(security_headers_middleware))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::auth_middleware,
        ));

    

    Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/ready", axum::routing::get(readiness_check))
        .route(
            "/api/v1/onboarding/status",
            get(handlers::onboarding::get_status),
        )
        .route(
            "/api/v1/onboarding/task-complete",
            post(handlers::onboarding::complete_task),
        )
        .route("/api/v1/changelog", get(handlers::changelog::get_changelog))
        .merge(public_routes)
        .merge(private_routes)
        .with_state(state)
}
