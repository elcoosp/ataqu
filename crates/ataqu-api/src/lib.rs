#![allow(unused_imports)]

use axum::{Router, extract::State, response::IntoResponse, Json};
use std::sync::Arc;
use dashmap::DashMap;
use moka::sync::Cache;
use tokio::sync::mpsc::UnboundedSender;
use metrics_exporter_prometheus::PrometheusHandle;
use sea_orm::DatabaseConnection;
use uuid::Uuid;
use ataqu_kernel::{IdGenerator, Clock};
use ataqu_application::{
    aegis_service::AegisService,
    cinq_service::CinqService,
    dial_service::DialService,
    pause_service::PauseService,
    pivot_service::PivotService,
    sond_service::SondService,
    spark_service::SparkService,
    tempo_service::TempoService,
    vault_service::VaultService,
    vista_service::VistaService,
};
use ataqu_application::pause_service::IdempotencyPort;
use ataqu_infra_repositories::email_tracking_writer::TrackingEvent;
use crate::middleware::rate_limit::RateLimiter;

pub mod error;
pub mod handlers;
pub mod middleware;

// Stubs for missing services (to be implemented later)
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
    // Simplified placeholders for complex types (will be refined later)
    pub ws_registry: Arc<()>,
    pub conn_index: Arc<()>,
    pub presence_counts: Arc<()>,
    pub email_tracking_tx: UnboundedSender<()>,
    pub rate_limiter: RateLimiter,
    pub metrics_handle: PrometheusHandle,
    pub sso_states: Arc<()>,
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
