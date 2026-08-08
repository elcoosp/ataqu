use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use lazy_static::lazy_static;
use moka::sync::Cache;
use std::time::Duration;
use uuid::Uuid;

use crate::AppState;

pub const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

lazy_static! {
    static ref IDEMPOTENCY_CACHE: Cache<Uuid, (StatusCode, axum::http::HeaderMap, Vec<u8>)> =
        Cache::builder()
            .max_capacity(10_000)
            .time_to_live(Duration::from_secs(7 * 24 * 60 * 60))
            .build();
}

pub fn flush_idempotency_cache() {
    IDEMPOTENCY_CACHE.invalidate_all();
}

/// Temporary pass-through middleware until idempotency is fully implemented.
pub async fn idempotency_middleware(
    State(_state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Just pass through for now
    Ok(next.run(req).await)
}
