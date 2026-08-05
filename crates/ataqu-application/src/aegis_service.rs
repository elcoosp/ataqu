// AEGIS application service – orchestrates auth flows.
// Uses domain repository trait (AuthRepository) and domain command structs.

use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;
use tracing::{info, instrument};
use uuid::Uuid;

use ataqu_domain_aegis::mfa::{generate_otpauth_url, generate_secret, verify_totp};
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
        if !cmd.email.reveal(&ataqu_security::PiiAccessKey::new_for_test()).contains('@') {
            return Err(AuthError::InvalidCredentials);
        }
        let salt = SaltString::generate(&mut rand::thread_rng());
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
        let secret = generate_secret();
        let qr_code_url = generate_otpauth_url(&secret, user.email.as_ref());
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

pub struct AegisService {
    repo: Arc<dyn AuthRepository + Send + Sync>,
    outbox: Arc<dyn crate::outbox::Outbox + Send + Sync>,
    domain: Arc<RealAegisDomain>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
    config: AegisConfig,
}

impl AegisService {
    pub fn new(
        repo: Arc<dyn AuthRepository + Send + Sync>,
        outbox: Arc<dyn crate::outbox::Outbox + Send + Sync>,
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
        let payload = serde_json::json!({
            "user_id": event.user_id,
            "tenant_id": user.tenant_id.as_uuid(),
            "created_at": event.created_at,
        });
        self.outbox.append("core", "UserCreated", user.id, &payload).await.map_err(AegisServiceError::Outbox)?;
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

    pub async fn list_users(&self, tenant_id: Uuid) -> Result<Vec<User>, AegisServiceError> {
        self.repo.list_users(tenant_id).await.map_err(AegisServiceError::Domain)
    }

    pub async fn update_user_role(&self, user_id: Uuid, role: String) -> Result<(), AegisServiceError> {
        let mut user = self.repo.find_by_id(user_id).await?
            .ok_or(AegisServiceError::NotFound("User not found".into()))?;
        user.role = role;
        self.repo.save_user(&user).await?;
        Ok(())
    }

    pub async fn create_api_key(&self, tenant_id: ataqu_kernel::TenantId, user_id: Uuid, name: String, expires_at: Option<SystemTime>) -> Result<ataqu_domain_aegis::api_key::ApiKeyCreated, AegisServiceError> {
        let cmd = ataqu_domain_aegis::api_key::CreateApiKeyCommand {
            tenant_id,
            user_id,
            name,
            expires_at,
        };
        let created = ataqu_domain_aegis::api_key::generate_api_key(cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(AegisServiceError::Validation)?;

        let key_entity = ataqu_domain_aegis::api_key::ApiKey {
            id: created.id,
            tenant_id,
            user_id,
            name: created.name.clone(),
            key_hash: {
                use sha2::{Digest, Sha256};
                let mut hasher = Sha256::new();
                hasher.update(created.key.as_bytes());
                format!("{:x}", hasher.finalize())
            },
            prefix: created.prefix.clone(),
            last_used_at: None,
            expires_at,
            created_at: created.created_at,
        };
        self.repo.save_api_key(&key_entity).await?;
        Ok(created)
    }

    pub async fn list_api_keys(&self, tenant_id: ataqu_kernel::TenantId, user_id: Uuid) -> Result<Vec<ataqu_domain_aegis::api_key::ApiKey>, AegisServiceError> {
        self.repo.list_api_keys(tenant_id.as_uuid(), user_id).await.map_err(AegisServiceError::Domain)
    }

    pub async fn delete_api_key(&self, tenant_id: ataqu_kernel::TenantId, id: Uuid) -> Result<(), AegisServiceError> {
        self.repo.delete_api_key(tenant_id.as_uuid(), id).await.map_err(AegisServiceError::Domain)
    }

    pub async fn validate_api_key(&self, key: &str) -> Result<User, AegisServiceError> {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        let hash = format!("{:x}", hasher.finalize());

        let api_key = self.repo.find_api_key_by_hash(&hash).await?
            .ok_or(AegisServiceError::AuthenticationFailed)?;

        if let Some(expires_at) = api_key.expires_at {
            if expires_at < self.clock.now() {
                return Err(AegisServiceError::AuthenticationFailed);
            }
        }

        let user = self.repo.find_by_id(api_key.user_id).await?
            .ok_or(AegisServiceError::AuthenticationFailed)?;

        if !user.is_active {
            return Err(AegisServiceError::AuthenticationFailed);
        }

        Ok(user)
    }
}

