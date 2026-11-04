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
/// 2. `Origin` — when present, it must be exactly same-origin with the
///    request `Host`. No `Origin` is allowed (non-browser clients such as curl,
///    mobile apps and server-to-server calls legitimately omit it).
///
/// Webhook endpoints are excluded: they are authenticated by an
/// HMAC signature, not by ambient credentials. The exemption is an exact
/// prefix match (`/api/spark/webhooks/`, `/api/vault/shopify/`) — the previous
/// substring check on "/webhooks/" would have exempted ANY state-changing
/// route whose path merely contained that string.
pub async fn csrf_middleware(req: Request, next: Next) -> Result<Response, StatusCode> {
    if req.method().is_safe() || path_is_public_webhook(req.uri().path()) {
        return Ok(next.run(req).await);
    }

    let headers = req.headers();

    // Modern, robust signal: a browser-initiated cross-site request is always
    // flagged by the user agent. Reject it for any state-changing method.
    if let Some(site) = headers.get("sec-fetch-site").and_then(|v| v.to_str().ok())
        && site.eq_ignore_ascii_case("cross-site")
    {
        return Err(StatusCode::FORBIDDEN);
    }

    // Defense-in-depth: if an Origin is supplied, it must match the Host.
    if let Some(origin) = headers.get("origin").and_then(|v| v.to_str().ok())
        && let Some(host) = headers.get("host").and_then(|v| v.to_str().ok())
    {
        let Ok(origin_url) = url::Url::parse(origin) else {
            return Err(StatusCode::FORBIDDEN);
        };
        let Some(origin_host) = origin_url.host_str() else {
            return Err(StatusCode::FORBIDDEN);
        };
        // `Url::port()` is None for default ports, matching a Host header without a port.
        let origin_authority = match origin_url.port() {
            Some(port) => format!("{origin_host}:{port}"),
            None => origin_host.to_string(),
        };
        let o = origin_authority.to_ascii_lowercase();
        let h = host.to_ascii_lowercase();
        // Exact match only (fixed in audit): the previous
        // `o.ends_with(".{h}")` accepted any *sibling* subdomain of the Host
        // (e.g. evil.ataqu.com passing for Host ataqu.com). Same-origin is the
        // deployment model (Caddy serves the SPA and proxies /api).
        let same_origin = o == h;
        if !same_origin {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    Ok(next.run(req).await)
}

/// Paths that carry third-party, HMAC-authenticated webhooks (CSRF-exempt).
fn path_is_public_webhook(path: &str) -> bool {
    path.starts_with("/api/spark/webhooks/") || path.starts_with("/api/vault/shopify/")
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderMap;

    fn headers(origin: Option<&str>, host: Option<&str>) -> HeaderMap {
        let mut h = HeaderMap::new();
        if let Some(o) = origin {
            h.insert("origin", o.parse().unwrap());
        }
        if let Some(host) = host {
            h.insert("host", host.parse().unwrap());
        }
        h
    }

    fn allowed(origin: Option<&str>, host: Option<&str>) -> bool {
        let h = headers(origin, host);
        if let (Some(o), Some(host)) = (
            h.get("origin").and_then(|v| v.to_str().ok()),
            h.get("host").and_then(|v| v.to_str().ok()),
        ) {
            let Ok(url) = url::Url::parse(o) else {
                return false;
            };
            let Some(oh) = url.host_str() else {
                return false;
            };
            let auth = match url.port() {
                Some(p) => format!("{oh}:{p}"),
                None => oh.to_string(),
            };
            let (o, hh) = (auth.to_ascii_lowercase(), host.to_ascii_lowercase());
            return o == hh;
        }
        true
    }

    #[test]
    fn same_host_and_port_allowed() {
        assert!(allowed(
            Some("http://localhost:5173"),
            Some("localhost:5173")
        ));
    }

    #[test]
    fn different_port_rejected() {
        assert!(!allowed(
            Some("http://localhost:3000"),
            Some("localhost:5173")
        ));
    }

    #[test]
    fn cross_site_rejected() {
        assert!(!allowed(Some("https://evil.test"), Some("localhost:5173")));
    }

    #[test]
    fn no_origin_allowed() {
        assert!(allowed(None, Some("localhost:5173")));
    }

    #[test]
    fn sibling_subdomain_rejected() {
        // Fixed in audit: a sibling subdomain of the Host must not pass.
        assert!(!allowed(Some("https://evil.ataqu.com"), Some("ataqu.com")));
    }

    #[test]
    fn webhook_prefixes_exempt() {
        assert!(path_is_public_webhook("/api/spark/webhooks/123/456"));
        assert!(path_is_public_webhook("/api/vault/shopify/callback"));
        assert!(!path_is_public_webhook("/api/dial/webhooks-eval"));
        assert!(!path_is_public_webhook("/api/cinq/webhooks"));
    }
}
