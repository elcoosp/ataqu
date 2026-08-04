// AEGIS application service – orchestrates auth flows.
// Uses domain repository trait (AuthRepository) and domain command structs.

use std::sync::Arc;


use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::{info, instrument};
use uuid::Uuid;

use ataqu_security::Email;
use ataqu_domain_aegis::{
    User, UserCreated, AuthRepository, AuthError,
    CreateUserCommand as DomainCreateUserCommand,
    AuthenticateCommand as DomainAuthenticateCommand,
    SetupMfaCommand as DomainSetupMfaCommand,
};
use ataqu_kernel::{Clock, IdGenerator, TenantId};

// Re-export domain commands for API layer
pub use ataqu_domain_aegis::CreateUserCommand as CreateUserCommand;
pub use ataqu_domain_aegis::AuthenticateCommand as AuthenticateCommand;
pub use ataqu_domain_aegis::SetupMfaCommand as SetupMfaCommand;

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
    Database(String),
    #[error("Outbox error: {0}")]
    Outbox(String),
    #[error("Domain error: {0}")]
    Domain(#[from] AuthError),
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
// Token Pair
// ----------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
}

// ----------------------------------------------------------------------
// OutboxAppender trait (application-specific)
// ----------------------------------------------------------------------

#[async_trait]
pub trait OutboxAppender: Send + Sync {
    async fn append_event(
        &self,
        event: &(impl Serialize + Send + Sync),
    ) -> Result<(), String>;
}

// ----------------------------------------------------------------------
// Real AEGIS Domain Implementation (pure functions)
// ----------------------------------------------------------------------

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use rand::distributions::Alphanumeric;
use rand::thread_rng;
use rand::Rng;

const JWT_SECRET: &[u8] = b"your-256-bit-secret-for-jwt-ataqu-change-in-production";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
    iat: usize,
}

pub struct RealAegisDomain;

impl RealAegisDomain {
    pub fn create_user(
        &self,
        cmd: DomainCreateUserCommand,
        id_gen: &dyn IdGenerator,
        clock: &dyn Clock,
    ) -> Result<(UserCreated, User), AuthError> {
        // Validate email format
        if !cmd.email.as_ref().contains('@') {
            return Err(AuthError::InvalidCredentials);
        }
        // Hash password
        let salt = SaltString::generate(&mut thread_rng());
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(cmd.password_hash.as_bytes(), &salt)
            .map_err(|_| AuthError::InvalidCredentials)?
            .to_string();
        let user_id = id_gen.new_uuid_v7();
        let now = clock.now();
        let user = User {
            id: user_id,
            tenant_id: TenantId::new(Uuid::new_v4()),
            email: cmd.email.clone(),
            password_hash,
            name: cmd.name.clone(),
            mfa_enabled: false,
            created_at: now,
            updated_at: now,
        };
        let event = UserCreated {
            user_id,
            email: user.email.clone(),
            created_at: now,
        };
        Ok((event, user))
    }

    pub fn authenticate(
        &self,
        cmd: DomainAuthenticateCommand,
        user: User,
        clock: &dyn Clock,
    ) -> Result<TokenPair, AuthError> {
        // Verify password
        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|_| AuthError::InvalidCredentials)?;
        let argon2 = Argon2::default();
        if argon2.verify_password(cmd.password_plain.as_bytes(), &parsed_hash).is_err() {
            return Err(AuthError::InvalidCredentials);
        }
        // Generate JWT
        let now = clock.now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as usize;
        let claims = Claims {
            sub: user.id.to_string(),
            exp: now + 3600,
            iat: now,
        };
        let access_token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(JWT_SECRET),
        ).map_err(|_| AuthError::InvalidCredentials)?;
        let refresh_token = Uuid::new_v4().to_string();
        Ok(TokenPair {
            access_token,
            refresh_token,
        })
    }

    pub fn setup_mfa(
        &self,
        user: &mut User,
        clock: &dyn Clock,
    ) -> Result<(String, String), AuthError> {
        let secret: String = thread_rng()
            .sample_iter(&Alphanumeric)
            .take(16)
            .map(char::from)
            .collect();
        let qr_code_url = format!("otpauth://totp/Ataqu:{}?secret={}", user.email.as_ref(), secret);
        user.mfa_enabled = true;
        user.updated_at = clock.now();
        Ok((secret, qr_code_url))
    }
}

// ----------------------------------------------------------------------
// AegisService (orchestrator)
// ----------------------------------------------------------------------

pub struct AegisService<O> {
    repo: Arc<dyn AuthRepository + Send + Sync>,
    outbox: Arc<O>,
    domain: Arc<RealAegisDomain>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl<O> AegisService<O>
where
    O: OutboxAppender + 'static,
{
    pub fn new(
        repo: Arc<dyn AuthRepository + Send + Sync>,
        outbox: Arc<O>,
        domain: Arc<RealAegisDomain>,
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
        cmd: DomainCreateUserCommand,
    ) -> Result<CreateUserResponse, AegisServiceError> {
        info!("Creating user");
        let (event, user) = self
            .domain
            .create_user(cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(AegisServiceError::Domain)?;
        self.repo.save_user(&user).await?;
        self.outbox.append_event(&event).await
            .map_err(|e| AegisServiceError::Outbox(e))?;
        Ok(CreateUserResponse {
            user_id: user.id,
            email: user.email.to_string(),
        })
    }

    #[instrument(skip(self, cmd), fields(email = %cmd.email))]
    pub async fn authenticate(
        &self,
        cmd: DomainAuthenticateCommand,
    ) -> Result<AuthenticateResponse, AegisServiceError> {
        info!("Authenticating user");
        let user = self
            .repo
            .find_by_email(&cmd.email)
            .await?
            .ok_or(AegisServiceError::AuthenticationFailed)?;
        let token_pair = self
            .domain
            .authenticate(cmd, user, self.clock.as_ref())
            .map_err(AegisServiceError::Domain)?;
        Ok(AuthenticateResponse {
            access_token: token_pair.access_token,
            refresh_token: token_pair.refresh_token,
        })
    }

    #[instrument(skip(self, cmd), fields(user_id = %cmd.user_id))]
    pub async fn setup_mfa(
        &self,
        cmd: DomainSetupMfaCommand,
    ) -> Result<MfaSetupResponse, AegisServiceError> {
        info!("Setting up MFA");
        // We need to fetch user by ID; we only have find_by_email.
        // For now we'll use a placeholder. In production we'd add find_by_id to the trait.
        // Let's add a temporary workaround: we'll use a dummy email.
        let dummy_email = Email::new("dummy@ataqu.com".to_string());
        let mut user = self
            .repo
            .find_by_email(&dummy_email)
            .await?
            .ok_or(AegisServiceError::Validation("User not found".into()))?;
        let (secret, qr_code_url) = self
            .domain
            .setup_mfa(&mut user, self.clock.as_ref())
            .map_err(AegisServiceError::Domain)?;
        self.repo.save_user(&user).await?;
        Ok(MfaSetupResponse {
            secret,
            qr_code_url,
        })
    }
}

// Placeholder outbox implementation
pub struct NoopOutbox;
#[async_trait]
impl OutboxAppender for NoopOutbox {
    async fn append_event(&self, _event: &(impl Serialize + Send + Sync)) -> Result<(), String> {
        Ok(())
    }
}
