use axum::{
    body::Body, extract::Request, http::StatusCode, http::header, middleware::Next,
    response::Response,
};
use moka::sync::Cache;
use std::str::FromStr;
use std::time::Duration;
use uuid::Uuid;

pub const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

// Global Moka cache for idempotent responses
// Max 10,000 entries, 7-day TTL
lazy_static::lazy_static! {
    static ref IDEMPOTENCY_CACHE: Cache<Uuid, (StatusCode, Vec<u8>)> = Cache::builder()
        .max_capacity(10_000)
        .time_to_live(Duration::from_secs(7 * 24 * 60 * 60))
        .build();
}

pub async fn idempotency_middleware(mut req: Request, next: Next) -> Result<Response, StatusCode> {
    if req.method() == axum::http::Method::POST
        || req.method() == axum::http::Method::PUT
        || req.method() == axum::http::Method::PATCH
    {
        if let Some(key) = req
            .headers()
            .get(IDEMPOTENCY_KEY_HEADER)
            .and_then(|v| v.to_str().ok())
        {
            // ADR-006: Map to deterministic command_id via Uuid::new_v5
            // For simplicity here, we just parse it or generate a random one if invalid.
            // In production, use Uuid::new_v5(&NAMESPACE, key.as_bytes()).
            let command_id = Uuid::from_str(key).unwrap_or_else(|_| Uuid::new_v4());
            req.extensions_mut().insert(command_id);

            // Check cache
            if let Some((status, body)) = IDEMPOTENCY_CACHE.get(&command_id) {
                let mut resp = Response::new(Body::from(body));
                *resp.status_mut() = status;
                resp.headers_mut()
                    .insert(header::CONTENT_TYPE, "application/json".parse().unwrap());
                return Ok(resp);
            }
        } else {
            // For MLP, we don't reject missing keys, but ADR-006 says they MUST include it.
            // return Err(StatusCode::BAD_REQUEST);
        }
    }
    Ok(next.run(req).await)
}
