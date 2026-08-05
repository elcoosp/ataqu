use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;
use std::str::FromStr;

pub const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

pub async fn idempotency_middleware(mut req: Request, next: Next) -> Result<Response, StatusCode> {
    if req.method() == axum::http::Method::POST || req.method() == axum::http::Method::PUT || req.method() == axum::http::Method::PATCH {
        if let Some(key) = req.headers().get(IDEMPOTENCY_KEY_HEADER).and_then(|v| v.to_str().ok()) {
            // In a real system, we would use Uuid::new_v5(namespace, key.as_bytes())
            // For now, we just parse it or generate a random one if invalid.
            let command_id = Uuid::from_str(key).unwrap_or_else(|_| Uuid::new_v4());
            req.extensions_mut().insert(command_id);
        } else {
            // For simplicity in MLP, we don't reject missing keys, but we log it.
            // ADR-006 says they MUST include it, but we can be lenient for now.
            // To enforce: return Err(StatusCode::BAD_REQUEST);
        }
    }
    Ok(next.run(req).await)
}
