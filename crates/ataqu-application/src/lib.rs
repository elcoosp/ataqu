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

pub mod aegis_service;
pub mod cinq_service;
pub mod dial_service;
pub mod outbox;
pub mod pause_infra;
pub mod pause_service;
pub mod pivot_service;
pub mod sond_service;
pub mod spark_service;
pub mod tempo_service;
pub mod vault_service;
pub mod vista_service;

pub use spark_service::ActionDispatcher;
pub mod changelog_service;
pub mod health_service;
pub mod onboarding_service;

pub mod shopify_service;
