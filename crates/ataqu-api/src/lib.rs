// ===== FILE: ataqu-api/src/lib.rs =====

//! Ataqu API layer – Axum handlers, middleware, and shared state.

use axum::{
    Router,
    extract::connect_info::IntoMakeServiceWithConnectInfo,
    extract::State,
    routing::{get, post},
};
use crate::error::ApiResponseError;
use std::net::SocketAddr;
use dashmap::DashMap;
use metrics_exporter_prometheus::PrometheusHandle;
use moka::sync::Cache;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio::sync::mpsc::Sender;
use uuid::Uuid;

use crate::middleware::rate_limit::RateLimiter;
use ataqu_application::{
    aegis_service::AegisService, cinq_service::CinqService, dial_service::DialService,
    pause_service::PauseService, pivot_service::PivotService, sond_service::SondService,
    spark_service::SparkService, tempo_service::TempoService, vault_service::VaultService,
    vista_service::VistaService,
};
use ataqu_infra_repositories::email_tracking_writer::TrackingEvent;
use ataqu_kernel::{Clock, IdGenerator};

pub mod error;
pub mod extractors;
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
    pub shopify_service: Arc<ataqu_application::shopify_service::ShopifyService>,
    pub jwt_secret: Arc<Vec<u8>>,
    pub id_gen: Arc<dyn IdGenerator + Send + Sync>,
    pub clock: Arc<dyn Clock + Send + Sync>,
    pub ws_registry: WsRegistry,
    pub conn_index: ConnIndex,
    pub presence_counts: PresenceCounts,
    pub email_tracking_tx: Sender<TrackingEvent>,
    pub rate_limiter: RateLimiter,
    /// Stateless HMAC-signed CSRF token protector for cookie-auth double-submit.
    pub csrf_protector: Arc<crate::middleware::csrf_token::CsrfProtector>,
    pub metrics_handle: PrometheusHandle,
    pub sso_states: SsoStates,
    pub sso_config: ataqu_domain_aegis::sso::SsoConfig,
    pub http_client: reqwest::Client,
    pub health_service: Arc<ataqu_application::health_service::HealthService>,
    pub health_cache: Arc<moka::sync::Cache<String, serde_json::Value>>,
    pub s3_service: Arc<S3Service>,
    pub onboarding_service: Arc<ataqu_application::onboarding_service::OnboardingService>,
    pub changelog_service: Arc<ataqu_application::changelog_service::ChangelogService>,
    pub amazon_service: Arc<ataqu_application::amazon_service::AmazonService>,
    pub audit_repo: Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>,
    /// Proxies allowed to supply X-Forwarded-For / X-Real-IP. Empty = trust no
    /// proxy (forwarding headers are ignored for security decisions).
    pub trusted_proxies: crate::middleware::client_ip::TrustedProxies,
    /// Short-TTL cache of tenant IP allowlists keyed by tenant id, so the
    /// per-request auth path does not hit the DB on every request.
    pub allowlist_cache: moka::sync::Cache<String, Vec<String>>,
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

/// Issue a CSRF double-submit token and return it.
///
/// `GET /api/v1/csrf-token` (safe, no auth): mints a signed token, sets it in a
/// `csrf_token` cookie (SameSite=Strict, not HttpOnly so the SPA can copy it
/// into the `X-CSRF-Token` header), and echoes the token in the
/// `X-CSRF-Token` response header. Clients call this once, then send the token
/// back on every state-changing request.
async fn issue_csrf_token(
    State(state): State<AppState>,
) -> Result<axum::response::Response, ApiResponseError> {
    use axum::http::{header, HeaderValue};
    let token = state.csrf_protector.issue();
    let cookie = format!(
        "{}={}; Path=/; Max-Age=86400; SameSite=Strict; Secure",
        crate::middleware::csrf_token::CSRF_COOKIE_NAME,
        token
    );
    let mut resp = axum::response::Response::builder()
        .status(axum::http::StatusCode::OK)
        .header(
            crate::middleware::csrf_token::CSRF_HEADER_NAME,
            HeaderValue::from_str(&token)
                .map_err(|_| ApiResponseError::internal("CSRF token is not valid UTF-8"))?,
        )
        .header(
            header::SET_COOKIE,
            HeaderValue::from_str(&cookie)
                .map_err(|_| ApiResponseError::internal("CSRF cookie is not valid UTF-8"))?,
        )
        .body(axum::body::Body::empty())
        .map_err(|_| ApiResponseError::internal("failed to build CSRF token response"))?;
    // Also expose the token in the JSON body for clients that prefer it.
    *resp.body_mut() = axum::body::Body::from(
        serde_json::to_vec(&serde_json::json!({ "csrfToken": token }))
            .map_err(|_| ApiResponseError::internal("failed to serialize CSRF token"))?,
    );
    Ok(resp)
}

pub fn create_router(state: AppState) -> IntoMakeServiceWithConnectInfo<Router, SocketAddr> {
    use handlers::aegis::routes as aegis_routes;
    use handlers::cinq::routes as cinq_routes;
    use handlers::dial::routes as dial_routes;
    use handlers::migration::routes as migration_routes;
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
        .route(
            "/api/v1/csrf-token",
            get(issue_csrf_token),
        )
        .layer(axum::middleware::from_fn(
            crate::middleware::etag::etag_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.rate_limiter.clone(),
            crate::middleware::rate_limit::rate_limit_middleware,
        ))
        .layer(axum::middleware::from_fn(request_id_middleware));
    let private_routes = Router::new()
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::audit::audit_middleware,
        ))
        .route(
            "/api/v1/onboarding/status",
            get(handlers::onboarding::get_status),
        )
        .route(
            "/api/v1/onboarding/task-complete",
            post(handlers::onboarding::complete_task),
        )
        .route("/api/v1/changelog", get(handlers::changelog::get_changelog))
        .route(
            "/api/v1/changelog/unread",
            get(handlers::changelog::get_unread_changelog),
        )
        .route(
            "/api/v1/changelog/mark-read",
            post(handlers::changelog::mark_changelog_read),
        )
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
        .nest("/api/migration", migration_routes())
        .nest("/api/gdpr", handlers::gdpr::routes())
        .route(
            "/api/search",
            axum::routing::get(handlers::search::unified_search),
        )
        .route("/metrics", axum::routing::get(metrics_handler))
        .route(
            "/api/v1/health/status",
            axum::routing::get(handlers::health::get_health_status),
        )
        .route(
            "/api/v1/onboarding/team-status",
            get(handlers::onboarding::team_status),
        )
        // Idempotency is now handled by the IdempotencyContext extractor
        .layer(axum::middleware::from_fn(
            crate::middleware::csrf::csrf_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.csrf_protector.clone(),
            crate::middleware::csrf_double_submit::csrf_double_submit_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.rate_limiter.clone(),
            crate::middleware::rate_limit::rate_limit_middleware,
        ))
        .layer(axum::middleware::from_fn(security_headers_middleware))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::auth_middleware,
        ))
        .layer(axum::middleware::from_fn(request_id_middleware));
    Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/ready", axum::routing::get(readiness_check))
        .route("/admin/health", axum::routing::get(health_check))
        .merge(public_routes)
        .merge(private_routes)
        .layer(axum::middleware::from_fn(
            crate::middleware::idempotency::idempotency_middleware,
        ))
        .with_state(state)
        .into_make_service_with_connect_info::<SocketAddr>()
}
