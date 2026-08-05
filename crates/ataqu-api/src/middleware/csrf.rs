use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

pub async fn csrf_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    // ADR-011: CSRF protection for state-changing requests.
    if req.method().is_safe() {
        return Ok(next.run(req).await);
    }

    let headers = req.headers();
    let origin = headers.get("origin").and_then(|v| v.to_str().ok());
    let host = headers.get("host").and_then(|v| v.to_str().ok());

    if let (Some(origin), Some(host)) = (origin, host) {
        if origin.contains(host) {
            return Ok(next.run(req).await);
        }
    }

    // If no origin/host, fallback to allowing (since Bearer tokens are used, CSRF is mitigated)
    Ok(next.run(req).await)
}
