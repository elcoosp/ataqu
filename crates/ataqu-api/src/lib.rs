#![allow(unused_imports)]
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
// use ataqu_application::pause_service::IdempotencyPort;
use ataqu_application::pause_service::PauseService;
use ataqu_application::pivot_service::PivotService;
use ataqu_application::sond_service::SondService;
use ataqu_application::spark_service::SparkService;
use ataqu_application::tempo_service::TempoService;
use ataqu_application::vault_service::VaultService;
use ataqu_application::vista_service::VistaService;
// use ataqu_domain_aegis::repository::AuditRepositoryTrait;
// use ataqu_infra_storage::s3_service::S3Service;
use ataqu_kernel::{Clock, IdGenerator};
use dashmap::DashMap;
use moka::sync::Cache;
use tokio::sync::mpsc::UnboundedSender;
use ataqu_infra_repositories::email_tracking_writer::TrackingEvent;


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


// Type aliases for complex types used in AppState


/// Application state shared across handlers.
#[derive(Clone)]

/// Application state shared across handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: sea_orm::DatabaseConnection,
    pub cinq_service: Arc<ataqu_application::cinq_service::CinqService>,
    pub dial_service: Arc<ataqu_application::dial_service::DialService>,
    pub pivot_service: Arc<ataqu_application::pivot_service::PivotService>,
    pub sond_service: Arc<ataqu_application::sond_service::SondService>,
    pub spark_service: Arc<ataqu_application::spark_service::SparkService>,
    pub tempo_service: Arc<ataqu_application::tempo_service::TempoService>,
    pub vault_service: Arc<ataqu_application::vault_service::VaultService>,
    pub vista_service: Arc<ataqu_application::vista_service::VistaService>,
    pub aegis_service: Arc<ataqu_application::aegis_service::AegisService>,
    pub pause_service: Arc<ataqu_application::pause_service::PauseService>,
    pub jwt_secret: Arc<Vec<u8>>,
    pub id_gen: Arc<dyn ataqu_kernel::IdGenerator + Send + Sync>,
    pub clock: Arc<dyn ataqu_kernel::Clock + Send + Sync>,
    // Simplified for compilation - these will be properly implemented later
    pub ws_registry: Arc<()>,
    pub conn_index: Arc<()>,
    pub presence_counts: Arc<()>,
    pub email_tracking_tx: tokio::sync::mpsc::UnboundedSender<()>,
    pub rate_limiter: crate::middleware::rate_limit::RateLimiter,
    pub metrics_handle: metrics_exporter_prometheus::PrometheusHandle,
    pub sso_states: Arc<()>,
    pub http_client: reqwest::Client,
    pub health_service: Arc<stubs::HealthService>,
    pub health_cache: Arc<moka::sync::Cache<(), ()>>,
    pub audit_repo: Arc<dyn stubs::AuditRepositoryTrait + Send + Sync>,
    pub s3_service: Arc<stubs::S3Service>,
    pub idempotency_guard: Arc<dyn ataqu_application::pause_service::IdempotencyPort + Send + Sync>,
    pub onboarding_service: Arc<stubs::OnboardingService>,
    pub changelog_service: Arc<stubs::ChangelogService>,
}




/// Application state shared across handlers.
#[derive(Clone)]
