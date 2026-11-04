//! Audit logging middleware for all state-changing HTTP requests.
use ataqu_kernel::TenantId;
use axum::{
    extract::{Request, State},
    http::{Method, StatusCode},
    middleware::Next,
    response::Response,
};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::{AppState, middleware::AuthContext};

/// Keys whose values must never reach the audit log (credentials and secrets
/// would otherwise be stored in cleartext — e.g. the password of every login
/// attempt). Matching is case-insensitive and substring-based so
/// `newPassword`, `refresh_token`, `client_secret`… are all caught.
const REDACTED_KEYS: &[&str] = &[
    "password",
    "secret",
    "token",
    "totp",
    "authorization",
    "api_key",
    "apikey",
    "code",
    "credential",
];

/// Largest request body captured verbatim; bigger bodies are logged as a
/// marker only (they are usually file uploads / bulk imports).
const MAX_AUDIT_BODY_BYTES: usize = 8 * 1024;

/// Recursively remove values of sensitive keys from a JSON document.
pub fn redact_sensitive_fields(value: &mut Value) {
    match value {
        Value::Object(map) => {
            let keys: Vec<String> = map.keys().cloned().collect();
            for k in keys {
                if REDACTED_KEYS
                    .iter()
                    .any(|needle| k.to_lowercase().contains(needle))
                {
                    map.insert(k, Value::String("[REDACTED]".to_string()));
                } else if let Some(child) = map.get_mut(&k) {
                    redact_sensitive_fields(child);
                }
            }
        }
        Value::Array(items) => {
            for item in items {
                redact_sensitive_fields(item);
            }
        }
        _ => {}
    }
}

/// Middleware that logs all non-GET requests to core.audit_logs.
pub async fn audit_middleware(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let method = req.method().clone();
    let path = req.uri().path().to_string();

    // Skip safe methods and health/ready endpoints
    if method == Method::GET || method == Method::HEAD || method == Method::OPTIONS {
        return Ok(next.run(req).await);
    }
    if path.starts_with("/health") || path.starts_with("/ready") || path.starts_with("/metrics") {
        return Ok(next.run(req).await);
    }

    // Extract auth context (if present)
    let auth_ctx = req.extensions().get::<AuthContext>().cloned();

    // Clone request body for logging (if needed)
    let (parts, body) = req.into_parts();
    // Read limit matches the largest route-level body limit (CINQ CSV import
    // allows 5 MB); audit *capture* stays capped at MAX_AUDIT_BODY_BYTES.
    // SECURITY/CORRECTNESS (fixed in audit): when the body exceeds even this
    // limit, `to_bytes` returns Err. The previous code
    // `unwrap_or_default()`-ed that into an EMPTY body and forwarded it to the
    // handler — silently destroying oversized requests (a 5 MB CSV import
    // arrived as an empty file and "succeeded" with zero rows). Now the
    // request is rejected with 413 so the client knows.
    let body_bytes = match axum::body::to_bytes(body, 8 * 1024 * 1024).await {
        Ok(b) => b,
        Err(_) => {
            metrics::counter!("ataqu_audit_body_too_large_total").increment(1);
            return Err(StatusCode::PAYLOAD_TOO_LARGE);
        }
    };

    // Reconstruct request for next handler
    let req = Request::from_parts(parts, axum::body::Body::from(body_bytes.clone()));

    // Run the handler
    let response = next.run(req).await;

    // Log the audit event asynchronously (don't block the response)
    let audit_repo = state.audit_repo.clone();
    let tenant_id = auth_ctx
        .as_ref()
        .map(|a| a.tenant_id)
        .unwrap_or(TenantId::new(Uuid::nil()));
    let user_id = auth_ctx.as_ref().map(|a| a.user_id).unwrap_or(Uuid::nil());
    let status = response.status().as_u16();

    tokio::spawn(async move {
        // SECURITY: never persist credentials. Redact sensitive keys and skip
        // oversized bodies entirely (the pre-fix middleware stored every
        // request body verbatim — including login passwords).
        let request_body_json = if body_bytes.len() > MAX_AUDIT_BODY_BYTES {
            json!({"_truncated": true, "size_bytes": body_bytes.len()})
        } else {
            match serde_json::from_slice::<Value>(&body_bytes) {
                Ok(mut v) => {
                    redact_sensitive_fields(&mut v);
                    v
                }
                Err(_) => json!({}),
            }
        };

        let _ = audit_repo
            .append_log(
                tenant_id,
                user_id,
                &format!("{} {}", method, path),
                "api",
                Some("http_request"),
                None,
                Some(json!({
                    "method": method.to_string(),
                    "path": path,
                    "body": request_body_json,
                })),
                Some(json!({
                    "status": status,
                })),
                None,
                None,
            )
            .await;
    });

    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::{MAX_AUDIT_BODY_BYTES, redact_sensitive_fields};
    use serde_json::json;

    #[test]
    fn passwords_and_tokens_are_redacted_recursively() {
        let mut v = json!({
            "email": "user@example.com",
            "password": "hunter2",
            "nested": {
                "refresh_token": "abc",
                "newPassword": "hunter3",
                "client_secret": "shh",
                "keep": "me"
            },
            "items": [{"totp_code": "123456"}, "plain"]
        });
        redact_sensitive_fields(&mut v);
        assert_eq!(v["password"], "[REDACTED]");
        assert_eq!(v["nested"]["refresh_token"], "[REDACTED]");
        assert_eq!(v["nested"]["newPassword"], "[REDACTED]");
        assert_eq!(v["nested"]["client_secret"], "[REDACTED]");
        assert_eq!(v["nested"]["keep"], "me");
        assert_eq!(v["items"][0]["totp_code"], "[REDACTED]");
        assert_eq!(v["items"][1], "plain");
        assert_eq!(v["email"], "user@example.com");
    }

    #[test]
    fn non_objects_pass_through() {
        let mut v = json!("just a string");
        redact_sensitive_fields(&mut v);
        assert_eq!(v, json!("just a string"));
    }

    #[test]
    fn oversize_marker_constant_is_sane() {
        const { assert!(MAX_AUDIT_BODY_BYTES >= 1024) };
    }
}
