use axum::body::to_bytes;
use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use lazy_static::lazy_static;
use moka::sync::Cache;

pub const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

lazy_static! {
    pub static ref IDEMPOTENCY_CACHE: Cache<String, (StatusCode, axum::http::HeaderMap, Vec<u8>)> =
        Cache::builder()
            .max_capacity(10_000)
            .time_to_live(std::time::Duration::from_secs(7 * 24 * 60 * 60))
            .build();
}

pub fn flush_idempotency_cache() {
    IDEMPOTENCY_CACHE.invalidate_all();
}

/// Idempotency middleware using Moka cache.
pub async fn idempotency_middleware(
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if req.method() == axum::http::Method::GET || req.method() == axum::http::Method::DELETE {
        return Ok(next.run(req).await);
    }

    let tenant_id = req
        .extensions()
        .get::<crate::middleware::AuthContext>()
        .map(|a| a.tenant_id.as_uuid().to_string())
        .unwrap_or_else(|| {
            req.headers()
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "global".to_string())
        });

    let key_str = req
        .headers()
        .get(IDEMPOTENCY_KEY_HEADER)
        .and_then(|v| v.to_str().ok())
        .map(|s| format!("{}:{}", tenant_id, s));

    if let Some(key) = &key_str {
        if let Some(cached) = IDEMPOTENCY_CACHE.get(key) {
            let mut resp = Response::builder().status(cached.0);
            for (k, v) in &cached.1 {
                resp = resp.header(k.clone(), v.clone());
            }
            return Ok(resp.body(axum::body::Body::from(cached.2)).unwrap());
        }
    }

    let resp = next.run(req).await;

    if let Some(key) = &key_str {
        if resp.status().is_success() {
            let status = resp.status();
            let headers = resp.headers().clone();
            let body = to_bytes(resp.into_body(), 1024 * 1024).await.unwrap_or_default();
            IDEMPOTENCY_CACHE.insert(key.clone(), (status, headers.clone(), body.to_vec()));

            let mut new_resp = Response::builder().status(status);
            for (k, v) in &headers {
                new_resp = new_resp.header(k.clone(), v.clone());
            }
            return Ok(new_resp.body(axum::body::Body::from(body)).unwrap());
        }
    }

    Ok(resp)
}
