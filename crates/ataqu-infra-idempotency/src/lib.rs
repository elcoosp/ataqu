//! Idempotency infrastructure for Ataqu.
pub mod cache;
pub mod guard;
pub mod store;

pub use cache::IdempotencyCache;
pub use guard::{AcquireOutcome, IdempotencyError, IdempotencyGuard};
pub use store::{
    CachedResponse, IdempotencyRecord, IdempotencyStatus, IdempotencyStore, SeaOrmIdempotencyStore,
};
