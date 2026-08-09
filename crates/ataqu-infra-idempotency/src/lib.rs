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

//! Idempotency infrastructure for Ataqu.
pub mod cache;
pub mod guard;
pub mod store;

pub use cache::IdempotencyCache;
pub use guard::{AcquireOutcome, IdempotencyError, IdempotencyGuard};
pub use store::{
    CachedResponse, IdempotencyRecord, IdempotencyStatus, IdempotencyStore, SeaOrmIdempotencyStore,
};
