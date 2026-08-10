use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};
use url::Url;

pub async fn csrf_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    // ADR-011: CSRF protection for state-changing requests.
    if req.method().is_safe() || req.uri().path().contains("/webhooks/") {
        return Ok(next.run(req).await);
    }

    let headers = req.headers();
    let origin = headers.get("origin").and_then(|v| v.to_str().ok());

    if let Some(origin) = origin {
        let host = headers.get("host").and_then(|v| v.to_str().ok());
        if let Some(host) = host {
            if let Ok(origin_url) = Url::parse(origin) {
                if let Some(origin_host) = origin_url.host_str() {
                    if origin_host == host || origin_host.ends_with(&format!(".{}", host)) {
                        return Ok(next.run(req).await);
                    }
                }
            }
        }
        return Err(StatusCode::FORBIDDEN);
    }

    // No Origin header, allow (API client)
    Ok(next.run(req).await)
}
