//! IP allowlist enforcement for authenticated tenant requests.
//!
//! When a tenant has a non-empty `ip_allowlist` in its `core.tenant_settings`
//! `settings` JSONB column, every authenticated request must originate from an
//! IP contained in that list (exact address or CIDR range). An empty list means
//! "allow all" (the default/opt-in behaviour).
use crate::AppState;
use crate::error::ApiResponseError;
use ataqu_kernel::TenantId;
use axum::http::HeaderMap;
use ipnetwork::IpNetwork;
use std::net::IpAddr;

/// Extract the originating client IP.
///
/// NOTE: this derives the IP from request headers (`X-Forwarded-For`,
/// `X-Real-IP`). Those headers are **client-controlled** and must NOT be
/// trusted for security decisions unless the request arrived from a configured
/// trusted reverse proxy. The IP allowlist enforcement therefore takes the
/// *real peer socket address* (see `auth_middleware`, which receives it via
/// axum `ConnectInfo<SocketAddr>`) rather than calling this function. This
/// helper is retained only for diagnostics / testing.
pub fn client_ip(headers: &HeaderMap) -> Option<IpAddr> {
    if let Some(xff) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        // Take the first address; it is the original client.
        if let Some(first) = xff.split(',').next()
            && let Ok(ip) = first.trim().parse::<IpAddr>() {
                return Some(ip);
            }
    }
    if let Some(real) = headers.get("x-real-ip").and_then(|v| v.to_str().ok())
        && let Ok(ip) = real.trim().parse::<IpAddr>() {
            return Some(ip);
        }
    None
}

/// Load the tenant's IP allowlist from `settings->'ip_allowlist'`.
async fn load_allowlist(
    state: &AppState,
    tenant_id: TenantId,
) -> Result<Vec<String>, ApiResponseError> {
    use sqlx::Row;
    let pool = state.db.get_postgres_connection_pool();
    let row = sqlx::query(
        "SELECT settings->'ip_allowlist' AS allowlist FROM core.tenant_settings WHERE tenant_id = $1",
    )
    .bind(tenant_id.as_uuid())
    .fetch_optional(pool)
    .await
    .map_err(|_| ApiResponseError::internal("Failed to read tenant IP allowlist"))?;

    let value = match row {
        Some(r) => r
            .get::<Option<serde_json::Value>, _>("allowlist")
            .unwrap_or(serde_json::Value::Null),
        None => serde_json::Value::Null,
    };
    let list = match value {
        serde_json::Value::Array(arr) => arr
            .into_iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect(),
        // Null, an empty array, or any malformed value means "no restriction".
        _ => Vec::new(),
    };
    Ok(list)
}

/// Returns true if `ip` is covered by the allowlist (exact or CIDR).
fn ip_matches(ip: IpAddr, allowlist: &[String]) -> bool {
    for entry in allowlist {
        if let Ok(net) = entry.parse::<IpNetwork>() {
            if net.contains(ip) {
                return true;
            }
        } else if let Ok(exact) = entry.parse::<IpAddr>()
            && exact == ip {
                return true;
            }
    }
    false
}

/// Enforce the tenant IP allowlist on an authenticated request.
///
/// `client_ip` is the **real peer socket address** (from axum
/// `ConnectInfo<SocketAddr>`), not a client-supplied `X-Forwarded-For`. Returns
/// `Ok(())` when access is permitted (empty list, undetermined client IP, or a
/// matching address) and `Err(ApiResponseError::Forbidden)` when the allowlist
/// is non-empty and the client IP is not covered by it.
pub async fn check_ip_allowlist(
    state: &AppState,
    tenant_id: TenantId,
    client_ip: Option<IpAddr>,
) -> Result<(), ApiResponseError> {
    let allowlist = load_allowlist(state, tenant_id).await?;
    if allowlist.is_empty() {
        return Ok(());
    }
    match client_ip {
        // If we cannot determine the client IP the peer address was not
        // captured (ConnectInfo unavailable). Failing closed would break
        // non-proxied/non-TCP deployments, so we allow; in a proper deployment
        // the peer address is always known.
        None => Ok(()),
        Some(ip) => {
            if ip_matches(ip, &allowlist) {
                Ok(())
            } else {
                metrics::counter!("ataqu_ip_allowlist_blocks_total").increment(1);
                Err(ApiResponseError::Forbidden(
                    "Access denied: your IP address is not in this tenant's allowlist".to_string(),
                ))
            }
        }
    }
}
