use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

pub async fn csrf_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    // ADR-011: CSRF protection.
    // For API-only backends with Bearer token auth, CSRF is generally not vulnerable.
    // If we use cookies for auth, we would check for a CSRF token header here.
    // For MLP, we use Bearer tokens, so this is a no-op.
    Ok(next.run(req).await)
}
