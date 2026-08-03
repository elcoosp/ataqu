// AEGIS application service – orchestrates auth flows.
// This version is simplified: it uses a transaction directly without idempotency guard.
// Idempotency will be added in a follow-up task.

use std::sync::Arc;
use std::time::SystemTime;

use async_trait::async_trait;
use sea_orm::{DatabaseTransaction, DbErr};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::{info, instrument, warn};
use uuid::Uuid;

use ataqu_security::Email;
use ataqu_domain_aegis::{User, UserCreated};
use ataqu_kernel::{Clock, IdGenerator};

// ----------------------------------------------------------------------
// Domain commands and types
// ----------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateUserCommand {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AuthenticateCommand {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SetupMfaCommand {
    pub user_id: Uuid,
}

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("Invalid email")]
    InvalidEmail,
    #[error("Invalid password")]
    InvalidPassword,
    #[error("User not found")]
    UserNotFound,
    #[error("MFA already enabled")]
    MfaAlreadyEnabled,
    #[error("MFA setup failed: {0}")]
    MfaSetupFailed(String),
    #[error("Authentication failed")]
    AuthFailed,
}




// ----------------------------------------------------------------------
// Traits for external capabilities
// ----------------------------------------------------------------------






#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn begin(&self) -> Result<DatabaseTransaction, DbErr>;
    async fn create_user(&self, txn: &mut DatabaseTransaction, user: &User) -> Result<(), DbErr>;
    async fn find_by_email(
        &self,
        txn: &mut DatabaseTransaction,
        email: &Email,            // Repository uses the PII newtype
    ) -> Result<Option<User>, DbErr>;
    async fn find_by_id(
        &self,
        txn: &mut DatabaseTransaction,
        id: &Uuid,
    ) -> Result<Option<User>, DbErr>;
    async fn update_user(&self, txn: &mut DatabaseTransaction, user: &User) -> Result<(), DbErr>;
}

#[async_trait]
pub trait OutboxAppender: Send + Sync {
    async fn append_event(
        &self,
        txn: &mut DatabaseTransaction,
        schema: &str,
        event: &(impl Serialize + Send + Sync),
    ) -> Result<(), DbErr>;
}

// ----------------------------------------------------------------------
// Service error
// ----------------------------------------------------------------------

#[derive(Debug, Error)]
pub enum AegisServiceError {
    #[error("Invalid input: {0}")]
    Validation(String),
    #[error("Authentication failed")]
    AuthenticationFailed,
    #[error("MFA setup failed: {0}")]
    MfaSetupFailed(String),
    #[error("Database error: {0}")]
    Database(#[from] DbErr),
    #[error("Outbox error: {0}")]
    Outbox(String),
    #[error("Domain error: {0}")]
    Domain(#[from] DomainError),
}

// ----------------------------------------------------------------------
// Responses
// ----------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct CreateUserResponse {
    pub user_id: Uuid,
    pub email: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuthenticateResponse {
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MfaSetupResponse {
    pub secret: String,
    pub qr_code_url: String,
}

// ----------------------------------------------------------------------
// Service (without idempotency guard for now)
// ----------------------------------------------------------------------


// ----------------------------------------------------------------------
// Traits and types for external capabilities
// ----------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
}

#[async_trait]
pub trait AegisDomain: Send + Sync {
    async fn create_user(
        &self,
        cmd: CreateUserCommand,
        id_gen: &dyn IdGenerator,
        clock: &dyn Clock,
    ) -> Result<(UserCreated, User), DomainError>;
    async fn authenticate(
        &self,
        cmd: AuthenticateCommand,
        user: User,
        clock: &dyn Clock,
    ) -> Result<TokenPair, DomainError>;
    async fn setup_mfa(
        &self,
        user: &mut User,
        clock: &dyn Clock,
    ) -> Result<(String, String), DomainError>;
}

pub struct AegisService<R, O, D> {
    repo: Arc<R>,
    outbox: Arc<O>,
    domain: Arc<D>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl<R, O, D> AegisService<R, O, D>
where
    R: UserRepository + 'static,
    O: OutboxAppender + 'static,
    D: AegisDomain + 'static,
{
    pub fn new(
        repo: Arc<R>,
        outbox: Arc<O>,
        domain: Arc<D>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            repo,
            outbox,
            domain,
            id_gen,
            clock,
        }
    }

    #[instrument(skip(self, cmd), fields(email = %cmd.email))]
    pub async fn create_user(
        &self,
        cmd: CreateUserCommand,
    ) -> Result<CreateUserResponse, AegisServiceError> {
        info!("Creating user");

        let mut txn = self.repo.begin().await?;

        // Domain logic
        let (event, user) = self
            .domain
            .create_user(cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .await?;

        // Persist
        self.repo.create_user(&mut txn, &user).await?;

        // Outbox
        self.outbox
            .append_event(&mut txn, "core", &event)
            .await
            .map_err(|e| AegisServiceError::Outbox(e.to_string()))?;

        // Commit
        txn.commit().await?;

        Ok(CreateUserResponse {
            user_id: user.id,
            email: user.email.to_string(),
        })
    }

    #[instrument(skip(self, cmd), fields(email = %cmd.email))]
    pub async fn authenticate(
        &self,
        cmd: AuthenticateCommand,
    ) -> Result<AuthenticateResponse, AegisServiceError> {
        info!("Authenticating user");

        let mut txn = self.repo.begin().await?;

        let email = Email::new(cmd.email.clone());
        let user = self
            .repo
            .find_by_email(&mut txn, &email)
            .await?
            .ok_or(AegisServiceError::AuthenticationFailed)?;

        let token_pair = self
            .domain
            .authenticate(cmd, user, self.clock.as_ref())
            .await?;

        txn.commit().await?;

        Ok(AuthenticateResponse {
            access_token: token_pair.access_token,
            refresh_token: token_pair.refresh_token,
        })
    }

    #[instrument(skip(self, cmd), fields(user_id = %cmd.user_id))]
    pub async fn setup_mfa(
        &self,
        cmd: SetupMfaCommand,
    ) -> Result<MfaSetupResponse, AegisServiceError> {
        info!("Setting up MFA");

        let mut txn = self.repo.begin().await?;

        let mut user = self
            .repo
            .find_by_id(&mut txn, &cmd.user_id)
            .await?
            .ok_or(AegisServiceError::Validation("User not found".into()))?;

        let (secret, qr_code_url) = self
            .domain
            .setup_mfa(&mut user, self.clock.as_ref())
            .await?;

        self.repo.update_user(&mut txn, &user).await?;

        txn.commit().await?;

        Ok(MfaSetupResponse {
            secret,
            qr_code_url,
        })
    }
}

// ----------------------------------------------------------------------
// Placeholder implementations (for testing / no‑op)
// ----------------------------------------------------------------------

pub struct NoopDomain;
#[async_trait]
impl AegisDomain for NoopDomain {
    async fn create_user(
        &self,
        _cmd: CreateUserCommand,
        _id_gen: &dyn IdGenerator,
        _clock: &dyn Clock,
    ) -> Result<(UserCreated, User), DomainError> {
        unimplemented!("Domain logic not yet implemented")
    }
    async fn authenticate(
        &self,
        _cmd: AuthenticateCommand,
        _user: User,
        _clock: &dyn Clock,
    ) -> Result<TokenPair, DomainError> {
        unimplemented!("Domain logic not yet implemented")
    }
    async fn setup_mfa(
        &self,
        _user: &mut User,
        _clock: &dyn Clock,
    ) -> Result<(String, String), DomainError> {
        unimplemented!("Domain logic not yet implemented")
    }
}

pub struct NoopOutbox;
#[async_trait]
impl OutboxAppender for NoopOutbox {
    async fn append_event(
        &self,
        _txn: &mut DatabaseTransaction,
        schema: &str,
        event: &(impl Serialize + Send + Sync),
    ) -> Result<(), DbErr> {
        // Serialize to JSON to avoid Debug
        let _ = serde_json::to_string(event).unwrap_or_else(|_| "{}".to_string());
        warn!("No‑op outbox: schema={}", schema);
        Ok(())
    }
}

pub struct NoopRepo;
#[async_trait]
impl UserRepository for NoopRepo {
    async fn begin(&self) -> Result<DatabaseTransaction, DbErr> {
        unimplemented!("NoopRepo does not provide a real transaction")
    }
    async fn create_user(&self, _txn: &mut DatabaseTransaction, _user: &User) -> Result<(), DbErr> {
        unimplemented!()
    }
    async fn find_by_email(
        &self,
        _txn: &mut DatabaseTransaction,
        _email: &Email,
    ) -> Result<Option<User>, DbErr> {
        unimplemented!()
    }
    async fn find_by_id(
        &self,
        _txn: &mut DatabaseTransaction,
        _id: &Uuid,
    ) -> Result<Option<User>, DbErr> {
        unimplemented!()
    }
    async fn update_user(&self, _txn: &mut DatabaseTransaction, _user: &User) -> Result<(), DbErr> {
        unimplemented!()
    }
}

pub struct SystemIdGenerator;
impl IdGenerator for SystemIdGenerator {
    fn new_uuid_v7(&self) -> Uuid {
        Uuid::now_v7()
    }
}

pub struct SystemClock;
impl Clock for SystemClock {
    fn now(&self) -> SystemTime {
        SystemTime::now()
    }
}

// ----------------------------------------------------------------------
// Compilation test
// ----------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;
use ataqu_kernel::{Clock, IdGenerator};
use ataqu_kernel::TenantId;

    #[test]
    fn service_compiles() {
        let repo = Arc::new(NoopRepo);
        let outbox = Arc::new(NoopOutbox);
        let domain = Arc::new(NoopDomain);
        let id_gen = Arc::new(SystemIdGenerator);
        let clock = Arc::new(SystemClock);
        let _service = AegisService::new(repo, outbox, domain, id_gen, clock);
    }
}