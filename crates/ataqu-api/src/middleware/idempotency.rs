use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use lazy_static::lazy_static;
use moka::sync::Cache;
use uuid::Uuid;

pub const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

lazy_static! {
    static ref IDEMPOTENCY_CACHE: Cache<Uuid, (StatusCode, axum::http::HeaderMap, Vec<u8>)> =
        Cache::builder()
            .max_capacity(10_000)
            .time_to_live(std::time::Duration::from_secs(7 * 24 * 60 * 60))
            .build();
}

pub fn flush_idempotency_cache() {
    IDEMPOTENCY_CACHE.invalidate_all();
}

/// Basic idempotency middleware using Moka cache.
pub async fn idempotency_middleware(
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if req.method() == axum::http::Method::GET || req.method() == axum::http::Method::DELETE {
        return Ok(next.run(req).await);
    }

    let key = req
        .headers()
        .get(IDEMPOTENCY_KEY_HEADER)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok());

    if let Some(key) = key {
        if let Some(cached) = IDEMPOTENCY_CACHE.get(&key) {
            let mut resp = Response::builder().status(cached.0);
            for (k, v) in &cached.1 {
                resp = resp.header(k.clone(), v.clone());
            }
            return Ok(resp.body(axum::body::Body::from(cached.2)).unwrap());
        }
    }

    Ok(next.run(req).await)
}
