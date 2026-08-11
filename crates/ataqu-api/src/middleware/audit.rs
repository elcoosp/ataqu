//! Audit logging middleware for all state-changing HTTP requests.
use axum::{
    extract::{Request, State},
    http::{Method, StatusCode},
    middleware::Next,
    response::Response,
};
use ataqu_kernel::TenantId;
use serde_json::json;
use uuid::Uuid;

use crate::{AppState, middleware::AuthContext};

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
    let (auth_ctx, req) = {
        let auth = req.extensions().get::<AuthContext>().cloned();
        (auth, req)
    };

    // Clone request body for logging (if needed)
    let (parts, body) = req.into_parts();
    let body_bytes = axum::body::to_bytes(body, 1024 * 1024) // limit to 1MB
        .await
        .unwrap_or_default();

    // Reconstruct request for next handler
    let req = Request::from_parts(parts, axum::body::Body::from(body_bytes.clone()));

    // Run the handler
    let response = next.run(req).await;

    // Log the audit event asynchronously (don't block the response)
    let audit_repo = state.audit_repo.clone();
    let tenant_id = auth_ctx.as_ref().map(|a| a.tenant_id).unwrap_or(TenantId::new(Uuid::nil()));
    let user_id = auth_ctx.as_ref().map(|a| a.user_id).unwrap_or(Uuid::nil());
    let status = response.status().as_u16();

    tokio::spawn(async move {
        let request_body_json = serde_json::from_slice(&body_bytes).unwrap_or(json!({}));
        let _response_body = "[captured]"; // We don't capture response body to avoid memory bloat

        let _ = audit_repo.append_log(
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
                "headers": {
                    "user_agent": None::<String>,
                }
            })),
            Some(json!({
                "status": status,
            })),
            None,
            None,
        ).await;
    });

    Ok(response)
}
