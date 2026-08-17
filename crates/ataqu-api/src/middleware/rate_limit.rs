use axum::extract::ConnectInfo;
use axum::{
    body::Body,
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use dashmap::DashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// [VULN-004] NOTE: This rate limiter is in-memory and not shared across instances.
/// For horizontal scaling, replace with a distributed store like Redis.
///
/// The per-IP key is derived from the *effective* client address: the peer
/// socket address unless the peer is a configured trusted proxy, in which case
/// `X-Forwarded-For` / `X-Real-IP` are honoured (the rightmost non-proxy hop).
#[derive(Clone)]
pub struct RateLimiter {
    requests: Arc<DashMap<String, Vec<Instant>>>,
    max_requests: usize,
    window: Duration,
    trusted_proxies: crate::middleware::client_ip::TrustedProxies,
}

impl RateLimiter {
    pub fn new(
        max_requests: usize,
        window: Duration,
        trusted_proxies: crate::middleware::client_ip::TrustedProxies,
    ) -> Self {
        Self {
            requests: Arc::new(DashMap::new()),
            max_requests,
            window,
            trusted_proxies,
        }
    }

    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut entry = self.requests.entry(key.to_string()).or_default();
        entry.retain(|t| now.duration_since(*t) < self.window);
        if entry.len() >= self.max_requests {
            false
        } else {
            entry.push(now);
            true
        }
    }

    pub fn cleanup(&self) {
        let now = Instant::now();
        let keys_to_remove: Vec<String> = self
            .requests
            .iter()
            .filter_map(|entry| {
                if entry
                    .value()
                    .iter()
                    .all(|t| now.duration_since(*t) >= self.window)
                {
                    Some(entry.key().clone())
                } else {
                    None
                }
            })
            .collect();

        for key in keys_to_remove {
            self.requests.remove(&key);
        }
    }
}

pub async fn rate_limit_middleware(
    State(limiter): State<RateLimiter>,
    ConnectInfo(peer_addr): ConnectInfo<SocketAddr>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Rate-limit key: prefer the authenticated tenant; otherwise fall back to
    // the *effective* client address. We use the peer socket address unless the
    // peer is a configured trusted proxy, in which case X-Forwarded-For /
    // X-Real-IP are honoured (see resolve_effective_client_ip). This defeats
    // header-spoofing bypass while still working correctly behind a real proxy.
    let effective_ip = crate::middleware::client_ip::resolve_effective_client_ip(
        peer_addr.ip(),
        req.headers(),
        &limiter.trusted_proxies,
    );
    let key = req
        .extensions()
        .get::<crate::middleware::AuthContext>()
        .map(|auth| format!("tenant:{}", auth.tenant_id.as_uuid()))
        .unwrap_or_else(|| format!("ip:{effective_ip}"));

    if limiter.check(&key) {
        Ok(next.run(req).await)
    } else {
        let resp = axum::response::Response::builder()
            .status(StatusCode::TOO_MANY_REQUESTS)
            .header("Retry-After", "60")
            .body(Body::from("Rate limit exceeded"))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        Ok(resp)
    }
}
