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
