use ataqu_infra_idempotency::CachedResponse;
use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use lazy_static::lazy_static;
use moka::sync::Cache;

pub const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

lazy_static! {
    pub static ref IDEMPOTENCY_CACHE: Cache<String, CachedResponse> = Cache::builder()
        .max_capacity(10_000)
        .time_to_live(std::time::Duration::from_secs(7 * 24 * 60 * 60))
        .build();
}

pub fn flush_idempotency_cache() {
    IDEMPOTENCY_CACHE.invalidate_all();
}

/// Idempotency middleware using Moka cache only for hot path.
/// Note: Advisory lock and durable storage are handled by the IdempotencyContext extractor.
pub async fn idempotency_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    let method = req.method();
    let is_state_changing = method == &axum::http::Method::POST
        || method == &axum::http::Method::PUT
        || method == &axum::http::Method::PATCH;

    let cache_key = if is_state_changing {
        let key_header = req
            .headers()
            .get(IDEMPOTENCY_KEY_HEADER)
            .ok_or(StatusCode::BAD_REQUEST)?
            .to_str()
            .map_err(|_| StatusCode::BAD_REQUEST)?
            .to_string();
        let tenant_id = req
            .extensions()
            .get::<crate::middleware::AuthContext>()
            .map(|a| a.tenant_id.as_uuid().to_string())
            .unwrap_or_else(|| "global".to_string());
        Some(format!("{}:{}", tenant_id, key_header))
    } else {
        None
    };

    if let Some(ref key) = cache_key {
        if let Some(cached) = IDEMPOTENCY_CACHE.get(key) {
            let mut resp = axum::response::Response::builder().status(cached.status);
            for (k, v) in &cached.headers {
                if let Ok(header_name) = axum::http::HeaderName::from_bytes(k.as_bytes())
                    && let Ok(header_value) = axum::http::HeaderValue::from_str(v)
                {
                    resp = resp.header(header_name, header_value);
                }
            }
            let body_bytes = serde_json::to_vec(&cached.body).unwrap_or_default();
            return Ok(resp.body(axum::body::Body::from(body_bytes)).unwrap());
        }
    }

    let resp = next.run(req).await;

    if let Some(key) = cache_key {
        if resp.status().is_success() {
            let status = resp.status();
            let headers = resp.headers().clone();
            let body = axum::body::to_bytes(resp.into_body(), 1024 * 1024)
                .await
                .unwrap_or_default();
            let body_json: serde_json::Value =
                serde_json::from_slice(&body).unwrap_or(serde_json::Value::Null);
            let mut header_map = std::collections::HashMap::new();
            for (k, v) in &headers {
                let k_str = k.to_string();
                if let Ok(v_str) = v.to_str() {
                    header_map.insert(k_str, v_str.to_string());
                }
            }
            let cached = CachedResponse {
                status: status.as_u16(),
                headers: header_map,
                body: body_json,
            };
            IDEMPOTENCY_CACHE.insert(key, cached);

            let mut new_resp = axum::response::Response::builder().status(status);
            for (k, v) in &headers {
                new_resp = new_resp.header(k.clone(), v.clone());
            }
            return Ok(new_resp.body(axum::body::Body::from(body)).unwrap());
        }
    }

    Ok(resp)
}
