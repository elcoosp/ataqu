#![allow(clippy::collapsible_if)]
#![allow(clippy::too_many_arguments)]
#![allow(clippy::redundant_closure)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::useless_conversion)]

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
