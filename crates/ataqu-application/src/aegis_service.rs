use chrono::{DateTime, Utc};
use std::net::IpAddr;
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
    repository::{AuditLogEntry, AuditRepositoryTrait},
};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_security::Email;

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

#[derive(Debug, Clone)]
pub struct CreateUserResponse {
    pub user_id: Uuid,
    pub email: Email,
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
pub struct ApiKeyAuthData {
    pub user_id: Uuid,
    pub tenant_id: ataqu_kernel::TenantId,
    pub email: ataqu_security::Email,
    pub role: String,
    pub scopes: Vec<String>,
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
    token_version: i32,
}

pub struct RealAegisDomain;

impl RealAegisDomain {
    pub fn create_user(
        &self,
        cmd: DomainCreateUserCommand,
        id_gen: &dyn IdGenerator,
        clock: &dyn Clock,
    ) -> Result<(UserCreated, User), AuthError> {
        if !cmd
            .email
            .reveal(&ataqu_security::PiiAccessKey::new_for_test())
            .contains('@')
        {
            return Err(AuthError::Validation("Invalid email format".to_string()));
        }
        let salt = SaltString::generate(&mut rand::thread_rng());
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(cmd.password.as_bytes(), &salt)
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
            version: 0,
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
    ) -> Result<User, AegisServiceError> {
        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|_| AegisServiceError::AuthenticationFailed)?;
        let argon2 = Argon2::default();
        if argon2
            .verify_password(cmd.password.as_bytes(), &parsed_hash)
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
        let mut updated_user = user;
        updated_user.last_login_at = Some(clock.now());
        Ok(updated_user)
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
    email_str: &str,
    config: &AegisConfig,
) -> Result<(String, String), AegisServiceError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as usize;
    let claims = JwtClaims {
        sub: user.id.to_string(),
        tenant_id: user.tenant_id.as_uuid(),
        email: email_str.to_string(),
        roles: vec![user.role.clone()],
        exp: now + config.access_token_ttl.as_secs() as usize,
        iat: now,
        token_type: "access".to_string(),
        token_version: user.version,
    };
    let refresh_claims = JwtClaims {
        exp: now + config.refresh_token_ttl.as_secs() as usize,
        token_type: "refresh".to_string(),
        token_version: user.version,
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
    audit_repo: Arc<dyn AuditRepositoryTrait + Send + Sync>,

    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
    config: AegisConfig,
}

impl AegisService {
    pub fn new(
        repo: Arc<dyn AuthRepository + Send + Sync>,
        outbox: Arc<dyn crate::outbox::Outbox + Send + Sync>,
        domain: Arc<RealAegisDomain>,
        audit_repo: Arc<dyn AuditRepositoryTrait + Send + Sync>,

        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
        config: AegisConfig,
    ) -> Self {
        Self {
            repo,
            outbox,
            domain,
            audit_repo,
            id_gen,
            clock,
            config,
        }
    }

    #[instrument(skip(self, cmd), fields(email = "[REDACTED]"))]
    pub async fn create_user(
        &self,
        cmd: DomainCreateUserCommand,
    ) -> Result<CreateUserResponse, AegisServiceError> {
        info!("Creating user");
        let (event, user) = self
            .domain
            .create_user(cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(AegisServiceError::Domain)?;

        match self.repo.save_user(&user).await {
            Ok(_) => (),
            Err(AuthError::Database(msg)) if msg.contains("23505") => {
                return Err(AegisServiceError::Conflict(
                    "Email already exists".to_string(),
                ));
            }
            Err(e) => return Err(AegisServiceError::Domain(e)),
        }
        let payload = serde_json::json!({
            "user_id": event.user_id,
            "tenant_id": user.tenant_id.as_uuid(),
            "created_at": event.created_at,
        });
        self.outbox
            .append("core", "UserCreated", user.id, &payload)
            .await
            .map_err(AegisServiceError::Outbox)?;
        Ok(CreateUserResponse {
            user_id: user.id,
            email: user.email.clone(),
        })
    }

    #[instrument(skip(self, cmd), fields(email = "[REDACTED]"))]
    pub async fn authenticate(
        &self,
        cmd: DomainAuthenticateCommand,
    ) -> Result<AuthenticateResponse, AegisServiceError> {
        info!("Authenticating user");
        let user = self
            .repo
            .find_by_email(&cmd.email, cmd.tenant_id)
            .await?
            .ok_or(AegisServiceError::AuthenticationFailed)?;

        if let Some(tenant_id) = cmd.tenant_id
            && user.tenant_id != tenant_id
        {
            return Err(AegisServiceError::AuthenticationFailed);
        }
        let email_str = user
            .email
            .reveal(&ataqu_security::PiiAccessKey::new_for_test())
            .to_string();
        let updated_user = self.domain.authenticate(cmd, user, self.clock.as_ref())?;
        let (access, refresh) = generate_token_pair(&updated_user, &email_str, &self.config)?;
        self.repo.save_user(&updated_user).await?;
        Ok(AuthenticateResponse {
            access_token: access,
            refresh_token: refresh,
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
        let email_str = user
            .email
            .reveal(&ataqu_security::PiiAccessKey::new_for_test())
            .to_string();
        let (access, refresh) = generate_token_pair(&user, &email_str, &self.config)?;
        Ok(AuthenticateResponse {
            access_token: access,
            refresh_token: refresh,
            user_id: user.id,
        })
    }

    pub async fn list_users(&self, tenant_id: ataqu_kernel::TenantId) -> Result<Vec<User>, AegisServiceError> {
        self.repo
            .list_users(tenant_id.as_uuid())
            .await
            .map_err(AegisServiceError::Domain)
    }

    pub async fn list_tenants(&self) -> Result<Vec<Uuid>, AegisServiceError> {
        self.repo
            .list_tenants()
            .await
            .map_err(AegisServiceError::Domain)
    }

    pub async fn find_user_by_email(
        &self,
        email: &Email,
    ) -> Result<Option<User>, AegisServiceError> {
        self.repo
            .find_by_email(email, None)
            .await
            .map_err(AegisServiceError::Domain)
    }

    pub async fn find_user_by_id(&self, user_id: Uuid) -> Result<Option<User>, AegisServiceError> {
        self.repo
            .find_by_id(user_id)
            .await
            .map_err(AegisServiceError::Domain)
    }

    pub async fn update_user_role(
        &self,
        tenant_id: TenantId,
        user_id: Uuid,
        role: String,
        expected_version: i32,
    ) -> Result<(), AegisServiceError> {
        let mut user = self
            .repo
            .find_by_id(user_id)
            .await?
            .ok_or(AegisServiceError::NotFound("User not found".into()))?;

        if user.tenant_id != tenant_id {
            return Err(AegisServiceError::NotFound("User not found".into()));
        }
        if user.version != expected_version {
            return Err(AegisServiceError::Conflict(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, user.version
            )));
        }
        let old_role = user.role.clone();
        user.role = role.clone();
        user.version += 1;
        self.repo.save_user(&user).await?;

        self.log_audit(
            user_id,
            tenant_id,
            "role_change",
            "aegis",
            Some("user"),
            Some(user_id),
            Some(serde_json::json!({ "role": old_role })),
            Some(serde_json::json!({ "role": role })),
            None,
            None,
        ).await.ok();

        Ok(())
    }

    pub async fn deactivate_user(
        &self,
        tenant_id: TenantId,
        user_id: Uuid,
    ) -> Result<(), AegisServiceError> {
        let mut user = self
            .repo
            .find_by_id(user_id)
            .await?
            .ok_or(AegisServiceError::NotFound("User not found".into()))?;

        if user.tenant_id != tenant_id {
            return Err(AegisServiceError::NotFound("User not found".into()));
        }

        let was_active = user.is_active;
        ataqu_domain_aegis::auth::deactivate_user(&mut user, self.clock.as_ref());
        user.version += 1; // [VULN-001] Increment version to invalidate old tokens
        self.repo.save_user(&user).await?;

        self.log_audit(
            user_id,
            tenant_id,
            "deactivate",
            "aegis",
            Some("user"),
            Some(user_id),
            Some(serde_json::json!({ "is_active": was_active })),
            Some(serde_json::json!({ "is_active": user.is_active })),
            None,
            None,
        ).await.ok();

        let payload = serde_json::json!({
            "user_id": user.id,
            "tenant_id": user.tenant_id.as_uuid(),
            "is_active": user.is_active,
        });
        self.outbox
            .append("core", "UserDeactivated", user.id, &payload)
            .await
            .map_err(AegisServiceError::Outbox)?;
        Ok(())
    }

    /// [VULN-002] Increments the user version to invalidate all existing tokens.
    pub async fn increment_user_version(&self, user_id: Uuid) -> Result<(), AegisServiceError> {
        let mut user = self
            .repo
            .find_by_id(user_id)
            .await?
            .ok_or(AegisServiceError::NotFound("User not found".into()))?;
        user.version += 1;
        user.updated_at = self.clock.now();
        self.repo.save_user(&user).await?;
        Ok(())
    }

    pub async fn create_api_key(
        &self,
        tenant_id: ataqu_kernel::TenantId,
        user_id: Uuid,
        name: String,
        expires_at: Option<SystemTime>,
        scopes: Vec<String>,
    ) -> Result<ataqu_domain_aegis::api_key::ApiKeyCreated, AegisServiceError> {
        let cmd = ataqu_domain_aegis::api_key::CreateApiKeyCommand {
            tenant_id,
            user_id,
            name,
            expires_at,
            scopes: scopes.clone(),
        };
        let created = ataqu_domain_aegis::api_key::generate_api_key(
            cmd,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        )
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
            scopes,
            last_used_at: None,
            expires_at,
            created_at: created.created_at,
        };
        self.repo.save_api_key(&key_entity).await?;
        Ok(created)
    }

    pub async fn list_api_keys(
        &self,
        tenant_id: ataqu_kernel::TenantId,
        user_id: Uuid,
    ) -> Result<Vec<ataqu_domain_aegis::api_key::ApiKey>, AegisServiceError> {
        self.repo
            .list_api_keys(tenant_id.as_uuid(), user_id)
            .await
            .map_err(AegisServiceError::Domain)
    }

    pub async fn delete_api_key(
        &self,
        tenant_id: ataqu_kernel::TenantId,
        id: Uuid,
    ) -> Result<(), AegisServiceError> {
        self.repo
            .delete_api_key(tenant_id.as_uuid(), id)
            .await
            .map_err(AegisServiceError::Domain)
    }

    pub async fn validate_api_key_data(
        &self,
        key: &str,
    ) -> Result<ApiKeyAuthData, AegisServiceError> {
        if key.len() < 12 {
            return Err(AegisServiceError::AuthenticationFailed);
        }
        let prefix = &key[..12];

        // Find all keys with this prefix (across all tenants)
        // This requires changing the repo trait to not require tenant_id.
        let api_keys = self.repo.find_api_keys_by_prefix_global(prefix).await?;

        for api_key in api_keys {
            if let Some(expires_at) = api_key.expires_at
                && expires_at < self.clock.now()
            {
                continue;
            }

            // Verify the key against the stored SHA256 hash
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(key.as_bytes());
            let hash_str = format!("{:x}", hasher.finalize());
            if hash_str != api_key.key_hash {
                continue;
            }

            let user = self
                .repo
                .find_by_id(api_key.user_id)
                .await?
                .ok_or(AegisServiceError::AuthenticationFailed)?;

            if !user.is_active {
                return Err(AegisServiceError::AuthenticationFailed);
            }

            let _ = self
                .repo
                .update_api_key_last_used(api_key.id, self.clock.now())
                .await;

            return Ok(ApiKeyAuthData {
                user_id: user.id,
                tenant_id: user.tenant_id,
                email: user.email,
                role: user.role,
                scopes: api_key.scopes,
            });
        }
        Err(AegisServiceError::AuthenticationFailed)
    }

    /// Note: SSO exchange is not tenant-scoped. If multiple tenants have users with the
    /// same email, the first match is returned. This is a known limitation.
    /// [VULN-003] SECURITY NOTE: SSO exchange is not tenant-scoped. If multiple tenants have users with the
    /// same email, the first match is returned. This is a known limitation. A proper fix requires
    /// tenant context in the SSO flow.
    pub async fn sso_exchange(
        &self,
        email: Email,
    ) -> Result<AuthenticateResponse, AegisServiceError> {
        let user =
            self.repo
                .find_by_email(&email, None)
                .await?
                .ok_or(AegisServiceError::NotFound(
                    "User not found. Please sign up first.".to_string(),
                ))?;

        if !user.is_active {
            return Err(AegisServiceError::AuthenticationFailed);
        }

        let email_str = user
            .email
            .reveal(&ataqu_security::PiiAccessKey::new_for_test())
            .to_string();
        let (access, refresh) = generate_token_pair(&user, &email_str, &self.config)?;
        Ok(AuthenticateResponse {
            access_token: access,
            refresh_token: refresh,
            user_id: user.id,
        })
    }

    pub async fn request_gdpr_deletion(&self, tenant_id: Uuid) -> Result<(), AegisServiceError> {
        let payload = serde_json::json!({
            "tenant_id": tenant_id,
            "requested_at": self.clock.now(),
        });
        self.outbox
            .append("core", "GdprDeletionRequested", tenant_id, &payload)
            .await
            .map_err(AegisServiceError::Outbox)?;
        Ok(())
    }

    /// NOTE: The system user has a nil TenantId so it can operate across all tenants.
    /// This is necessary for SPARK actions that create resources in different tenants.
    pub async fn ensure_system_user(&self, user_id: Uuid) -> Result<(), AegisServiceError> {
        if self.repo.find_by_id(user_id).await?.is_none() {
            let now = self.clock.now();
            let user = User {
                id: user_id,
                tenant_id: TenantId::new(Uuid::nil()),
                email: Email::new("system@ataqu.com".to_string()),
                password_hash: String::new(),
                name: Some("System".to_string()),
                mfa_secret: None,
                mfa_enabled: false,
                is_active: true,
                role: "admin".to_string(),
                created_at: now,
                updated_at: now,
                last_login_at: None,
                version: 0,
            };
            self.repo.save_user(&user).await?;
        }
        Ok(())
    }

    pub async fn request_password_reset(&self, email: Email) -> Result<(), AegisServiceError> {
        let user = match self.repo.find_by_email(&email, None).await? {
            Some(u) => u,
            None => return Ok(()),
        };

        if !user.is_active {
            return Ok(());
        }

        let email_str = user
            .email
            .reveal(&ataqu_security::PiiAccessKey::new_for_test())
            .to_string();
        let payload = serde_json::json!({
            "user_id": user.id,
            "tenant_id": user.tenant_id.as_uuid(),
            "email": email_str,
        });
        self.outbox
            .append("core", "PasswordResetRequested", user.id, &payload)
            .await
            .map_err(AegisServiceError::Outbox)?;

        Ok(())
    }

    pub async fn reset_password(
        &self,
        token: &str,
        new_password: String,
    ) -> Result<(), AegisServiceError> {
        let claims: JwtClaims = decode(
            token,
            &DecodingKey::from_secret(&self.config.jwt_secret),
            &Validation::default(),
        )
        .map_err(|_| AegisServiceError::AuthenticationFailed)?
        .claims;

        if claims.token_type != "reset_password" {
            return Err(AegisServiceError::AuthenticationFailed);
        }

        let user_id =
            Uuid::parse_str(&claims.sub).map_err(|_| AegisServiceError::AuthenticationFailed)?;
        let mut user = self
            .repo
            .find_by_id(user_id)
            .await?
            .ok_or(AegisServiceError::AuthenticationFailed)?;

        let salt = SaltString::generate(&mut rand::thread_rng());
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(new_password.as_bytes(), &salt)
            .map_err(|_| AegisServiceError::Internal("Hashing failed".to_string()))?
            .to_string();

        user.password_hash = password_hash;
        user.version += 1;
        user.updated_at = self.clock.now();
        self.repo.save_user(&user).await?;

        // Invalidate all existing sessions for this user by bumping the user version.
        // The auth middleware checks the token_version against the user version.

        Ok(())
    }

    /// Get audit logs for a tenant with pagination and filters.
    #[allow(clippy::too_many_arguments)]
    pub async fn get_audit_logs(
        &self,
        tenant_id: TenantId,
        limit: i64,
        offset: i64,
        action_filter: Option<String>,
        app_filter: Option<String>,
        from_date: Option<DateTime<Utc>>,
        to_date: Option<DateTime<Utc>>,
    ) -> Result<Vec<AuditLogEntry>, AegisServiceError> {
        self.audit_repo
            .list_logs(
                tenant_id,
                limit,
                offset,
                action_filter.as_deref(),
                app_filter.as_deref(),
                from_date,
                to_date,
            )
            .await
            .map_err(AegisServiceError::Internal)
    }

    /// Get the permission matrix for a tenant.
    pub async fn get_permission_matrix(
        &self,
        tenant_id: TenantId,
    ) -> Result<Vec<serde_json::Value>, AegisServiceError> {
        let entries = self
            .audit_repo
            .get_permission_matrix(tenant_id)
            .await
            .map_err(AegisServiceError::Internal)?;
        let mut result = Vec::new();
        for entry in entries {
            result.push(serde_json::json!({
                "user_id": entry.user_id,
                "user_name": entry.user_name,
                "user_email": entry.user_email,
                "roles": entry.role_per_app,
            }));
        }
        Ok(result)
    }

    /// Internal helper to log an audit entry.
    /// Internal helper to log an audit entry.
    #[allow(dead_code, clippy::too_many_arguments)]
    async fn log_audit(
        &self,
        user_id: Uuid,
        tenant_id: TenantId,
        action: &str,
        app: &str,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
        old_value: Option<serde_json::Value>,
        new_value: Option<serde_json::Value>,
        ip_address: Option<IpAddr>,
        user_agent: Option<&str>,
    ) -> Result<(), AegisServiceError> {
        self.audit_repo
            .append_log(
                tenant_id,
                user_id,
                action,
                app,
                entity_type,
                entity_id,
                old_value,
                new_value,
                ip_address,
                user_agent,
            )
            .await
            .map_err(AegisServiceError::Internal)?;
        Ok(())
    }
}
