//! AEGIS authentication domain logic.

use ataqu_kernel::{Clock, IdGenerator, TenantId};

use crate::Email;
use std::time::SystemTime;
use uuid::Uuid;

/// Command to create a new user.
#[derive(Debug, Clone)]
pub struct CreateUserCommand {
    pub email: Email,
    pub password_hash: String,
    pub name: Option<String>,
}

/// Command to authenticate a user with email and password.
#[derive(Debug, Clone)]
pub struct AuthenticateCommand {
    pub email: Email,
    pub password_plain: String,
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
    pub mfa_enabled: bool,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
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
}

/// Repository trait for user persistence (defined in domain).
pub trait AuthRepository {
    fn find_by_email(&self, email: &Email) -> Option<User>;
    fn save_user(&self, user: &User) -> Result<(), AuthError>;
}

/// Pure function to create a user. Returns a UserCreated event.
pub fn create_user(
    cmd: CreateUserCommand,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
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
    clock: &impl Clock,
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
    clock: &impl Clock,
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

#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_kernel::{Clock, IdGenerator};
    use std::time::{SystemTime, UNIX_EPOCH};

    struct MockIdGenerator;
    impl IdGenerator for MockIdGenerator {
        fn new_uuid_v7(&self) -> Uuid {
            Uuid::from_u128(42)
        }
    }

    struct MockClock;
    impl Clock for MockClock {
        fn now(&self) -> SystemTime {
            UNIX_EPOCH + std::time::Duration::from_secs(123456789)
        }
    }

    #[test]
    fn test_create_user() {
        let cmd = CreateUserCommand {
            email: Email::new("test@example.com".to_string()),
            password_hash: "hash".to_string(),
            name: Some("Test".to_string()),
        };
        let id_gen = MockIdGenerator;
        let clock = MockClock;
        let event = create_user(cmd, &id_gen, &clock);
        assert_eq!(event.user_id, Uuid::from_u128(42));
        assert_eq!(event.email.as_ref(), "test@example.com");
        assert_eq!(event.created_at, clock.now());
    }

    #[test]
    fn test_create_user_without_name() {
        let cmd = CreateUserCommand {
            email: Email::new("test@example.com".to_string()),
            password_hash: "hash".to_string(),
            name: None,
        };
        let id_gen = MockIdGenerator;
        let clock = MockClock;
        let event = create_user(cmd, &id_gen, &clock);
        assert_eq!(event.user_id, Uuid::from_u128(42));
        assert_eq!(event.email.as_ref(), "test@example.com");
        assert_eq!(event.created_at, clock.now());
    }

    #[test]
    fn test_authenticate_success() {
        let user = User {
            id: Uuid::new_v4(),
            tenant_id: TenantId::new(Uuid::new_v4()),
            email: Email::new("test@example.com".to_string()),
            password_hash: "hash".to_string(),
            name: None,
            mfa_enabled: false,
            created_at: SystemTime::now(),
            updated_at: SystemTime::now(),
        };
        let cmd = AuthenticateCommand {
            email: Email::new("test@example.com".to_string()),
            password_plain: "password".to_string(),
        };
        let clock = MockClock;
        let result = authenticate(cmd, &user, true, &clock);
        assert!(result.is_ok());
        let success = result.unwrap();
        assert_eq!(success.user_id, user.id);
        assert_eq!(success.timestamp, clock.now());
    }

    #[test]
    fn test_authenticate_failure() {
        let user = User {
            id: Uuid::new_v4(),
            tenant_id: TenantId::new(Uuid::new_v4()),
            email: Email::new("test@example.com".to_string()),
            password_hash: "hash".to_string(),
            name: None,
            mfa_enabled: false,
            created_at: SystemTime::now(),
            updated_at: SystemTime::now(),
        };
        let cmd = AuthenticateCommand {
            email: Email::new("test@example.com".to_string()),
            password_plain: "wrong".to_string(),
        };
        let clock = MockClock;
        let result = authenticate(cmd, &user, false, &clock);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.reason, "invalid password");
    }

    #[test]
    fn test_setup_mfa() {
        let mut user = User {
            id: Uuid::new_v4(),
            tenant_id: TenantId::new(Uuid::new_v4()),
            email: Email::new("test@example.com".to_string()),
            password_hash: "hash".to_string(),
            name: None,
            mfa_enabled: false,
            created_at: SystemTime::now(),
            updated_at: SystemTime::now(),
        };
        let cmd = SetupMfaCommand {
            user_id: user.id,
            totp_secret: "secret123".to_string(),
        };
        let clock = MockClock;
        let result = setup_mfa(cmd, &mut user, &clock);
        assert!(result.is_ok());
        assert!(user.mfa_enabled);
        assert_eq!(user.updated_at, clock.now());
        let event = result.unwrap();
        assert_eq!(event.secret, "secret123");
        assert_eq!(event.completed_at, clock.now());
    }

    #[test]
    fn test_setup_mfa_already_enabled() {
        let mut user = User {
            id: Uuid::new_v4(),
            tenant_id: TenantId::new(Uuid::new_v4()),
            email: Email::new("test@example.com".to_string()),
            password_hash: "hash".to_string(),
            name: None,
            mfa_enabled: true,
            created_at: SystemTime::now(),
            updated_at: SystemTime::now(),
        };
        let cmd = SetupMfaCommand {
            user_id: user.id,
            totp_secret: "secret123".to_string(),
        };
        let clock = MockClock;
        let result = setup_mfa(cmd, &mut user, &clock);
        assert!(matches!(result, Err(AuthError::MfaAlreadyEnabled)));
    }
}
