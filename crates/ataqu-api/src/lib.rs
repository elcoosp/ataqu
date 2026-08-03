//! Ataqu API - unified HTTP server for all 10 apps.

pub mod error;
pub mod handlers;
pub mod middleware;
pub mod serializers;

use axum::Router;
use std::sync::Arc;
use uuid::Uuid;
use sea_orm::{DatabaseTransaction, DbErr};

// Import all application services.
use ataqu_application::aegis_service::{AegisService, AegisDomain, UserRepository, OutboxAppender, DomainError, CreateUserCommand, AuthenticateCommand, TokenPair};
use ataqu_application::cinq_service::CinqService;
use ataqu_application::dial_service::DialService;
use ataqu_application::pause_service::PauseService;
use ataqu_application::pivot_service::PivotService;
use ataqu_application::sond_service::SondService;
use ataqu_application::spark_service::SparkService;
use ataqu_application::tempo_service::TempoService;
use ataqu_application::vault_service::VaultService;
use ataqu_application::vista_service::VistaService;

// Kernel capabilities
use ataqu_kernel::{Clock, IdGenerator};
use ataqu_security::Email;
use ataqu_domain_aegis::{User, UserCreated};

// Simple system implementations
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

// Placeholder implementations for Aegis (no-op, returning errors)
pub struct AegisDomainPlaceholder;
#[async_trait::async_trait]
impl AegisDomain for AegisDomainPlaceholder {
    async fn create_user(
        &self,
        _cmd: CreateUserCommand,
        _id_gen: &dyn IdGenerator,
        _clock: &dyn Clock,
    ) -> Result<(UserCreated, User), DomainError> {
        Err(DomainError::InvalidEmail)
    }
    async fn authenticate(
        &self,
        _cmd: AuthenticateCommand,
        _user: User,
        _clock: &dyn Clock,
    ) -> Result<TokenPair, DomainError> {
        Err(DomainError::InvalidEmail)
    }
    async fn setup_mfa(
        &self,
        _user: &mut User,
        _clock: &dyn Clock,
    ) -> Result<(String, String), DomainError> {
        Err(DomainError::InvalidEmail)
    }
}

pub struct UserRepoPlaceholder;
#[async_trait::async_trait]
impl UserRepository for UserRepoPlaceholder {
    async fn begin(&self) -> Result<DatabaseTransaction, DbErr> {
        unimplemented!()
    }
    async fn create_user(&self, _txn: &mut DatabaseTransaction, _user: &User) -> Result<(), DbErr> {
        unimplemented!()
    }
    async fn find_by_email(&self, _txn: &mut DatabaseTransaction, _email: &Email) -> Result<Option<User>, DbErr> {
        unimplemented!()
    }
    async fn find_by_id(&self, _txn: &mut DatabaseTransaction, _id: &Uuid) -> Result<Option<User>, DbErr> {
        unimplemented!()
    }
    async fn update_user(&self, _txn: &mut DatabaseTransaction, _user: &User) -> Result<(), DbErr> {
        unimplemented!()
    }
}

pub struct OutboxPlaceholder;
#[async_trait::async_trait]
impl OutboxAppender for OutboxPlaceholder {
    async fn append_event(
        &self,
        _txn: &mut DatabaseTransaction,
        _schema: &str,
        _event: &(impl serde::Serialize + Send + Sync),
    ) -> Result<(), DbErr> {
        Ok(())
    }
}

// AppState with all services
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
    pub aegis_service: Arc<AegisService<UserRepoPlaceholder, OutboxPlaceholder, AegisDomainPlaceholder>>,
    pub pause_service: Arc<PauseService>, // Will need dependencies later
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
