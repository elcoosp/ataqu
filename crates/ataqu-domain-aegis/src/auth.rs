//! AEGIS authentication domain logic.

use crate::types::Email;
use async_trait::async_trait;
use ataqu_kernel::{Clock, IdGenerator, TenantId};

use std::time::SystemTime;
use uuid::Uuid;

/// Command to create a new user.
#[derive(Debug, Clone)]
pub struct CreateUserCommand {
    pub tenant_id: TenantId,
    pub email: Email,
    pub password: String,
    pub name: Option<String>,
}

/// Command to authenticate a user with email and password.
#[derive(Debug, Clone)]
pub struct AuthenticateCommand {
    pub email: Email,
    pub password: String,
    pub totp_code: Option<String>,
    pub tenant_id: Option<TenantId>,
}

/// Command to set up MFA for a user.
#[derive(Debug, Clone)]
pub struct SetupMfaCommand {
    pub user_id: Uuid,
    pub totp_secret: String,
}

/// Domain entity representing a user.
#[derive(Debug, Clone)]
pub struct User {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub email: Email,
    pub password_hash: String,
    pub name: Option<String>,
    pub mfa_secret: Option<String>,
    pub mfa_enabled: bool,
    pub is_active: bool,
    pub role: String,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
    pub last_login_at: Option<SystemTime>,
    pub version: i32,
}

/// Event emitted when a user is created.
#[derive(Debug, Clone, PartialEq)]
pub struct UserCreated {
    pub user_id: Uuid,
    pub email: Email,
    pub created_at: SystemTime,
}

/// Event emitted when authentication succeeds.
#[derive(Debug, Clone, PartialEq)]
pub struct AuthenticationSucceeded {
    pub user_id: Uuid,
    pub timestamp: SystemTime,
}

/// Event emitted when authentication fails.
#[derive(Debug, Clone, PartialEq)]
pub struct AuthenticationFailed {
    pub email: Email,
    pub reason: String,
    pub timestamp: SystemTime,
}

/// Event emitted when MFA setup is completed.
#[derive(Debug, Clone, PartialEq)]
pub struct MfaSetupCompleted {
    pub user_id: Uuid,
    pub secret: String,
    pub completed_at: SystemTime,
}

/// Errors that can occur during authentication or MFA setup.
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("User not found")]
    UserNotFound,
    #[error("Invalid credentials")]
    InvalidCredentials,
    #[error("MFA already enabled")]
    MfaAlreadyEnabled,
    #[error("Database error: {0}")]
    Database(String),
}

/// Repository trait for user persistence (async).
#[async_trait]
pub trait AuthRepository: Send + Sync {
    async fn find_by_email(&self, email: &Email) -> Result<Option<User>, AuthError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AuthError>;
    async fn save_user(&self, user: &User) -> Result<(), AuthError>;
    async fn list_users(&self, tenant_id: Uuid) -> Result<Vec<User>, AuthError>;
    async fn list_tenants(&self) -> Result<Vec<Uuid>, AuthError>;

    async fn save_api_key(&self, key: &crate::api_key::ApiKey) -> Result<(), AuthError>;
    async fn find_api_key_by_hash(
        &self,
        hash: &str,
    ) -> Result<Option<crate::api_key::ApiKey>, AuthError>;
    async fn list_api_keys(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<crate::api_key::ApiKey>, AuthError>;
    async fn delete_api_key(&self, tenant_id: Uuid, id: uuid::Uuid) -> Result<(), AuthError>;
    async fn update_api_key_last_used(
        &self,
        id: Uuid,
        last_used_at: std::time::SystemTime,
    ) -> Result<(), AuthError>;
}

/// Pure function to create a user. Returns a UserCreated event.
#[allow(dead_code)]
pub fn create_user(
    cmd: CreateUserCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> UserCreated {
    let user_id = id_gen.new_uuid_v7();
    let now = clock.now();
    UserCreated {
        user_id,
        email: cmd.email,
        created_at: now,
    }
}

/// Pure function to authenticate a user. Returns Ok(Success) or Err(Failed).
pub fn authenticate(
    cmd: AuthenticateCommand,
    stored_user: &User,
    password_match: bool,
    clock: &dyn Clock,
) -> Result<AuthenticationSucceeded, AuthenticationFailed> {
    let now = clock.now();
    if !password_match {
        return Err(AuthenticationFailed {
            email: cmd.email,
            reason: "invalid password".to_string(),
            timestamp: now,
        });
    }
    Ok(AuthenticationSucceeded {
        user_id: stored_user.id,
        timestamp: now,
    })
}

/// Pure function to set up MFA for a user. Mutates the user and returns an event.
pub fn setup_mfa(
    cmd: SetupMfaCommand,
    user: &mut User,
    clock: &dyn Clock,
) -> Result<MfaSetupCompleted, AuthError> {
    if user.mfa_enabled {
        return Err(AuthError::MfaAlreadyEnabled);
    }
    user.mfa_enabled = true;
    user.updated_at = clock.now();
    Ok(MfaSetupCompleted {
        user_id: cmd.user_id,
        secret: cmd.totp_secret,
        completed_at: clock.now(),
    })
}

/// Pure function to deactivate a user. Mutates the user.
pub fn deactivate_user(user: &mut User, clock: &dyn Clock) {
    user.is_active = false;
    user.updated_at = clock.now();
}


#[cfg(test)]
mod tests {
    // tests...
}
