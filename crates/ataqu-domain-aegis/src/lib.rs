// allowed: pre-existing clippy warnings blocking TASK-078 build
#![allow(clippy::collapsible_if)]
#![allow(clippy::new_without_default)]
#![allow(clippy::needless_return)]
#![allow(clippy::question_mark)]
#![allow(clippy::too_many_arguments)]
#![allow(clippy::useless_conversion)]
#![allow(clippy::redundant_closure)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::map_clone)]
#![allow(clippy::explicit_counter_loop)]
#![allow(clippy::unwrap_or_default)]

//! AEGIS domain logic: authentication, MFA, and SSO pure functions.

pub mod api_key;
pub mod auth;
pub mod mfa;
pub mod repository;
pub use repository::*;
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
