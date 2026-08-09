#![allow(unused_imports)]

//! Ataqu API layer – Axum handlers, middleware, and shared state.

use axum::{
    Router,
    extract::State,
    response::IntoResponse,
    routing::{get, post},
};
use dashmap::DashMap;
use metrics_exporter_prometheus::PrometheusHandle;
use moka::sync::Cache;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio::sync::mpsc::Sender;
use uuid::Uuid;

use ataqu_application::pause_service::IdempotencyPort;
use ataqu_application::{
    aegis_service::AegisService, cinq_service::CinqService, dial_service::DialService,
    pause_service::PauseService, pivot_service::PivotService, sond_service::SondService,
    spark_service::SparkService, tempo_service::TempoService, vault_service::VaultService,
    vista_service::VistaService,
};
use ataqu_infra_repositories::email_tracking_writer::TrackingEvent;
use ataqu_kernel::{Clock, IdGenerator};
use crate::middleware::rate_limit::RateLimiter;

pub mod error;
pub mod handlers;
pub mod middleware;
pub mod serializers;

// Stubs for missing dependencies
pub mod stubs {
    pub struct HealthService;
    pub struct OnboardingService;
    pub struct ChangelogService;
    pub struct S3Service;
    pub trait AuditRepositoryTrait {}
    pub struct DummyAuditRepo;
    impl AuditRepositoryTrait for DummyAuditRepo {}
}
pub use stubs::*;

// Type aliases matching the handler expectations
pub type WsRegistry =
    Arc<DashMap<(Uuid, Uuid), Arc<DashMap<usize, tokio::sync::mpsc::UnboundedSender<String>>>>>;
pub type ConnIndex = Arc<DashMap<usize, Uuid>>;
pub type PresenceCounts = Arc<DashMap<Uuid, i32>>;
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
    pub health_service: Arc<HealthService>,
    pub health_cache: Arc<Cache<(), ()>>,
    pub audit_repo: Arc<dyn AuditRepositoryTrait + Send + Sync>,
    pub s3_service: Arc<S3Service>,
    pub idempotency_guard: Arc<dyn IdempotencyPort + Send + Sync>,
    pub onboarding_service: Arc<OnboardingService>,
    pub changelog_service: Arc<ChangelogService>,
}

pub fn create_router(state: AppState) -> Router {
    use crate::handlers::*;
    Router::new()
        .nest("/api/v1/dial", dial::routes())
        .with_state(state)
}
