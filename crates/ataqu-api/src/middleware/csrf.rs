use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

pub async fn csrf_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    // ADR-011: CSRF protection for state-changing requests.
    // Since this API uses Bearer tokens and API keys (not cookies), CSRF is not a primary threat.
    // However, we enforce Origin/Host validation as a defense-in-depth measure for browser clients.
    // If Origin is missing (e.g., API clients like curl), we allow the request.
    if req.method().is_safe() || req.uri().path().contains("/webhooks/") {
        return Ok(next.run(req).await);
    }

    let headers = req.headers();
    let origin = headers.get("origin").and_then(|v| v.to_str().ok());

    // If Origin is present, validate it. If missing, allow (likely an API client).
    if let Some(origin) = origin {
        let host = headers.get("host").and_then(|v| v.to_str().ok());
        if let Some(host) = host {
            // Fix: robust suffix check to prevent bypasses like "evil.com?ataqu.com"
            let origin_host = origin.split("://").nth(1).unwrap_or(origin);
            if origin_host == host || origin_host.ends_with(&format!(".{}", host)) {
                return Ok(next.run(req).await);
            }
        }
        // Origin present but Host missing or mismatched
        return Err(StatusCode::FORBIDDEN);
    }

    // No Origin header, allow (API client)
    Ok(next.run(req).await)
}
