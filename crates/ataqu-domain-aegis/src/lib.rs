//! AEGIS domain logic: authentication, MFA, and SSO pure functions.

pub mod api_key;
pub mod auth;
pub mod mfa;
pub mod sso;
pub mod types;

// Re-export Email from types for convenience
pub use types::Email;

pub use auth::{
    AuthError, AuthRepository, AuthenticateCommand, AuthenticationFailed, AuthenticationSucceeded,
    CreateUserCommand, MfaSetupCompleted, SetupMfaCommand, User, UserCreated, authenticate,
    create_user, setup_mfa,
};

pub mod repository;
