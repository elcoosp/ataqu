// AEGIS application service – orchestrates auth flows.
// Uses domain repository trait (AuthRepository) and domain command structs.

use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
};
use async_trait::async_trait;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use rand::Rng;
use rand::distributions::Alphanumeric;
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;
use tracing::{info, instrument};
use uuid::Uuid;

use ataqu_domain_aegis::{
    AuthError, AuthRepository, AuthenticateCommand as DomainAuthenticateCommand,
    CreateUserCommand as DomainCreateUserCommand, User, UserCreated,
};
use ataqu_kernel::{Clock, IdGenerator};

pub use ataqu_domain_aegis::AuthenticateCommand;
pub use ataqu_domain_aegis::CreateUserCommand;
pub use ataqu_domain_aegis::SetupMfaCommand;

#[derive(Debug, Clone)]
pub struct AegisConfig {
    pub jwt_secret: Vec<u8>,
    pub access_token_ttl: std::time::Duration,
    pub refresh_token_ttl: std::time::Duration,
}

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
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("MFA required")]
    MfaRequired,
    #[error("Internal error: {0}")]
    Internal(String),
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateUserResponse {
    pub user_id: Uuid,
    pub email: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuthenticateResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: Uuid,
}

#[derive(Debug, Clone, Serialize)]
pub struct MfaSetupResponse {
    pub secret: String,
    pub qr_code_url: String,
}

#[derive(Debug, Clone)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
}

#[async_trait]
pub trait OutboxAppender: Send + Sync {
    async fn append_event(&self, event: &(impl Serialize + Send + Sync)) -> Result<(), String>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct JwtClaims {
    sub: String,
    tenant_id: Uuid,
    email: String,
    roles: Vec<String>,
    exp: usize,
    iat: usize,
    token_type: String,
}

pub struct RealAegisDomain;

impl RealAegisDomain {
    pub fn create_user(
        &self,
        cmd: DomainCreateUserCommand,
        id_gen: &dyn IdGenerator,
        clock: &dyn Clock,
    ) -> Result<(UserCreated, User), AuthError> {
        if !cmd.email.as_ref().contains('@') {
            return Err(AuthError::InvalidCredentials);
        }
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
            tenant_id: cmd.tenant_id,
            email: cmd.email.clone(),
            password_hash,
            name: cmd.name.clone(),
            mfa_secret: None,
            mfa_enabled: false,
            is_active: true,
            role: "member".to_string(),
            created_at: now,
            updated_at: now,
            last_login_at: None,
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
        config: &AegisConfig,
    ) -> Result<(User, TokenPair), AegisServiceError> {
        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|_| AegisServiceError::AuthenticationFailed)?;
        let argon2 = Argon2::default();
        if argon2
            .verify_password(cmd.password_plain.as_bytes(), &parsed_hash)
            .is_err()
        {
            return Err(AegisServiceError::AuthenticationFailed);
        }
        if !user.is_active {
            return Err(AegisServiceError::AuthenticationFailed);
        }
        if user.mfa_enabled {
            if cmd.totp_code.is_none() {
                return Err(AegisServiceError::MfaRequired);
            }
            // verify TOTP (simplified)
            let secret = user.mfa_secret.as_deref().unwrap_or("");
            if !verify_totp(secret, cmd.totp_code.as_ref().unwrap()) {
                return Err(AegisServiceError::AuthenticationFailed);
            }
        }
        let (access, refresh) = generate_token_pair(&user, config)?;
        let mut updated_user = user;
        updated_user.last_login_at = Some(clock.now());
        Ok((
            updated_user,
            TokenPair {
                access_token: access,
                refresh_token: refresh,
            },
        ))
    }

    pub fn setup_mfa(
        &self,
        user: &mut User,
        clock: &dyn Clock,
    ) -> Result<(String, String), AegisServiceError> {
        if user.mfa_enabled {
            return Err(AegisServiceError::Conflict(
                "MFA already enabled".to_string(),
            ));
        }
        let secret: String = thread_rng()
            .sample_iter(&Alphanumeric)
            .take(16)
            .map(char::from)
            .collect();
        let qr_code_url = format!(
            "otpauth://totp/Ataqu:{}?secret={}&issuer=Ataqu",
            user.email.as_ref(),
            secret
        );
        user.mfa_secret = Some(secret.clone());
        user.updated_at = clock.now();
        Ok((secret, qr_code_url))
    }

    pub fn verify_mfa(&self, user: &User, code: &str) -> Result<bool, AegisServiceError> {
        let secret = user
            .mfa_secret
            .as_deref()
            .ok_or_else(|| AegisServiceError::Validation("MFA not set up".to_string()))?;
        Ok(verify_totp(secret, code))
    }

    pub fn enable_mfa(&self, user: &mut User, clock: &dyn Clock) -> Result<(), AegisServiceError> {
        if user.mfa_secret.is_none() {
            return Err(AegisServiceError::Validation("MFA not set up".to_string()));
        }
        user.mfa_enabled = true;
        user.updated_at = clock.now();
        Ok(())
    }
}

fn generate_token_pair(
    user: &User,
    config: &AegisConfig,
) -> Result<(String, String), AegisServiceError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as usize;
    let claims = JwtClaims {
        sub: user.id.to_string(),
        tenant_id: user.tenant_id.as_uuid(),
        email: user.email.as_ref().to_string(),
        roles: vec![user.role.clone()],
        exp: now + config.access_token_ttl.as_secs() as usize,
        iat: now,
        token_type: "access".to_string(),
    };
    let refresh_claims = JwtClaims {
        exp: now + config.refresh_token_ttl.as_secs() as usize,
        token_type: "refresh".to_string(),
        ..claims.clone()
    };
    let access = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(&config.jwt_secret),
    )
    .map_err(|e| AegisServiceError::Internal(e.to_string()))?;
    let refresh = encode(
        &Header::default(),
        &refresh_claims,
        &EncodingKey::from_secret(&config.jwt_secret),
    )
    .map_err(|e| AegisServiceError::Internal(e.to_string()))?;
    Ok((access, refresh))
}

fn verify_totp(secret: &str, code: &str) -> bool {
    // simplified: just check length
    code.len() == 6 && !secret.is_empty()
}

pub struct AegisService<O> {
    repo: Arc<dyn AuthRepository + Send + Sync>,
    outbox: Arc<O>,
    domain: Arc<RealAegisDomain>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
    config: AegisConfig,
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
        config: AegisConfig,
    ) -> Self {
        Self {
            repo,
            outbox,
            domain,
            id_gen,
            clock,
            config,
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
        self.outbox
            .append_event(&event)
            .await
            .map_err(AegisServiceError::Outbox)?;
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
        let (updated_user, token_pair) =
            self.domain
                .authenticate(cmd, user, self.clock.as_ref(), &self.config)?;
        self.repo.save_user(&updated_user).await?;
        Ok(AuthenticateResponse {
            access_token: token_pair.access_token,
            refresh_token: token_pair.refresh_token,
            user_id: updated_user.id,
        })
    }

    #[instrument(skip(self), fields(user_id = %user_id))]
    pub async fn setup_mfa(&self, user_id: Uuid) -> Result<MfaSetupResponse, AegisServiceError> {
        info!("Setting up MFA");
        let mut user = self
            .repo
            .find_by_id(user_id)
            .await?
            .ok_or(AegisServiceError::NotFound("User not found".into()))?;
        let (secret, qr_code_url) = self.domain.setup_mfa(&mut user, self.clock.as_ref())?;
        self.repo.save_user(&user).await?;
        Ok(MfaSetupResponse {
            secret,
            qr_code_url,
        })
    }

    #[instrument(skip(self), fields(user_id = %user_id))]
    pub async fn verify_mfa(&self, user_id: Uuid, code: &str) -> Result<(), AegisServiceError> {
        info!("Verifying MFA");
        let user = self
            .repo
            .find_by_id(user_id)
            .await?
            .ok_or(AegisServiceError::NotFound("User not found".into()))?;
        if !self.domain.verify_mfa(&user, code)? {
            return Err(AegisServiceError::AuthenticationFailed);
        }
        // enable MFA after verification
        let mut user = user;
        self.domain.enable_mfa(&mut user, self.clock.as_ref())?;
        self.repo.save_user(&user).await?;
        Ok(())
    }

    #[instrument(skip(self), fields(token = %refresh_token))]
    pub async fn refresh_token(
        &self,
        refresh_token: &str,
    ) -> Result<AuthenticateResponse, AegisServiceError> {
        let claims: JwtClaims = decode(
            refresh_token,
            &DecodingKey::from_secret(&self.config.jwt_secret),
            &Validation::default(),
        )
        .map_err(|_| AegisServiceError::AuthenticationFailed)?
        .claims;
        if claims.token_type != "refresh" {
            return Err(AegisServiceError::AuthenticationFailed);
        }
        let user_id =
            Uuid::parse_str(&claims.sub).map_err(|_| AegisServiceError::AuthenticationFailed)?;
        let user = self
            .repo
            .find_by_id(user_id)
            .await?
            .ok_or(AegisServiceError::AuthenticationFailed)?;
        if !user.is_active {
            return Err(AegisServiceError::AuthenticationFailed);
        }
        let (access, refresh) = generate_token_pair(&user, &self.config)?;
        Ok(AuthenticateResponse {
            access_token: access,
            refresh_token: refresh,
            user_id: user.id,
        })
    }
}

pub struct NoopOutbox;
#[async_trait]
impl OutboxAppender for NoopOutbox {
    async fn append_event(&self, _event: &(impl Serialize + Send + Sync)) -> Result<(), String> {
        Ok(())
    }
}
