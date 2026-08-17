//! Double-submit CSRF enforcement middleware (see `csrf_token` for the scheme).
//!
//! Applied to the private (authenticated) route tree. It only enforces the
//! double-submit token for requests that are NOT header-authenticated
//! (`Authorization` / `X-API-Key` absent) and are state-changing + not webhook
//! endpoints. Header-auth API clients and anonymous safe requests are
//! unaffected; cookie-auth requests (once present) must carry a matching
//! `X-CSRF-Token` header + `csrf_token` cookie.
use crate::middleware::csrf_token::verify_double_submit;
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use std::sync::Arc;

fn is_header_authenticated(headers: &axum::http::HeaderMap) -> bool {
    headers
        .get("authorization")
        .map(|v| !v.is_empty())
        .unwrap_or(false)
        || headers
            .get("x-api-key")
            .map(|v| !v.is_empty())
            .unwrap_or(false)
}

pub async fn csrf_double_submit_middleware(
    State(protector): State<Arc<crate::middleware::csrf_token::CsrfProtector>>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Safe methods and webhooks need no CSRF token.
    if req.method().is_safe() || req.uri().path().contains("/webhooks/") {
        return Ok(next.run(req).await);
    }

    let headers = req.headers().clone();
    // Header-auth requests carry no ambient cookie credential the browser could
    // attach cross-site, so double-submit is not applicable (and would break
    // legitimate API clients). Exempt them.
    if is_header_authenticated(&headers) {
        return Ok(next.run(req).await);
    }

    // Cookie-auth (or anonymous) state-changing request: require a valid
    // double-submit token. Without cookie auth this still runs, but such
    // requests are rejected by the auth middleware regardless — and the moment
    // a session cookie exists, this is exactly the control that stops CSRF.
    if !verify_double_submit(&headers, &protector) {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(next.run(req).await)
}
