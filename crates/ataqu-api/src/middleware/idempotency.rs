use axum::body::{Body, to_bytes};
use axum::extract::Request;
use axum::http::StatusCode;
use axum::http::header;
use axum::middleware::Next;
use axum::response::Response;
use moka::sync::Cache;
use sha2::{Digest, Sha256};
use std::time::Duration;
use uuid::Uuid;

pub const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

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
        || req.method() == axum::http::Method::DELETE
    {
        if let Some(key) = req
            .headers()
            .get(IDEMPOTENCY_KEY_HEADER)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
        {
            let (parts, body) = req.into_parts();
            let bytes = to_bytes(body, 1024 * 1024)
                .await
                .map_err(|_| StatusCode::PAYLOAD_TOO_LARGE)?;

            // Fix: Hash key + body to prevent different payloads with same key
            let mut hasher = Sha256::new();
            hasher.update(key.as_bytes());
            hasher.update(&bytes);
            let hash = hasher.finalize();
            let command_id = Uuid::new_v5(&Uuid::NAMESPACE_URL, &hash);

            if let Some((status, body)) = IDEMPOTENCY_CACHE.get(&command_id) {
                let mut resp = Response::new(Body::from(body));
                *resp.status_mut() = status;
                resp.headers_mut()
                    .insert(header::CONTENT_TYPE, "application/json".parse().unwrap());
                return Ok(resp);
            }

            req = Request::from_parts(parts, Body::from(bytes));
            req.extensions_mut().insert(command_id);

            let resp = next.run(req).await;

            if resp.status().is_success() {
                let (parts, body) = resp.into_parts();
                let bytes = to_bytes(body, 1024 * 1024)
                    .await
                    .map_err(|_| StatusCode::PAYLOAD_TOO_LARGE)?;
                IDEMPOTENCY_CACHE.insert(command_id, (parts.status, bytes.to_vec()));
                return Ok(Response::from_parts(parts, Body::from(bytes)));
            }
            return Ok(resp);
        }
    }
    Ok(next.run(req).await)
}
