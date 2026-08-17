use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

/// CSRF protection for state-changing requests (ADR-011).
///
/// For an API that authenticates with bearer tokens / API keys (not cookies),
/// the browser cannot attach those credentials cross-origin, so classic CSRF
/// is largely mitigated. This middleware adds defense-in-depth using two
/// browser-controlled signals that an attacker cannot forge from a malicious
/// page:
///
/// 1. `Sec-Fetch-Site` — present on all fetch/XHR/subresource requests made by
///    a browser. A cross-site request (`cross-site`) is rejected for unsafe
///    methods. (An attacker's page cannot suppress or alter this header.)
/// 2. `Origin` — when present, must be same-origin (or a subdomain of) the
///    request `Host`. No `Origin` is allowed (non-browser clients such as curl,
///    mobile apps and server-to-server calls legitimately omit it).
///
/// Webhook endpoints (`/webhooks/`) are excluded: they are authenticated by an
/// HMAC signature, not by ambient credentials.
pub async fn csrf_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    if req.method().is_safe() || req.uri().path().contains("/webhooks/") {
        return Ok(next.run(req).await);
    }

    let headers = req.headers();

    // Modern, robust signal: a browser-initiated cross-site request is always
    // flagged by the user agent. Reject it for any state-changing method.
    if let Some(site) = headers.get("sec-fetch-site").and_then(|v| v.to_str().ok())
        && site.eq_ignore_ascii_case("cross-site") {
            return Err(StatusCode::FORBIDDEN);
        }

    // Defense-in-depth: if an Origin is supplied, it must match the Host.
    if let Some(origin) = headers.get("origin").and_then(|v| v.to_str().ok()) {
        let host = headers.get("host").and_then(|v| v.to_str().ok());
        if let Some(host) = host {
            let Ok(origin_url) = url::Url::parse(origin) else {
                return Err(StatusCode::FORBIDDEN);
            };
            let Some(origin_host) = origin_url.host_str() else {
                return Err(StatusCode::FORBIDDEN);
            };
            let same_origin =
                origin_host == host || origin_host.ends_with(&format!(".{host}"));
            if !same_origin {
                return Err(StatusCode::FORBIDDEN);
            }
        }
    }

    Ok(next.run(req).await)
}
