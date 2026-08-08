use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// [VULN-004] NOTE: This rate limiter is in-memory and not shared across instances.
/// For horizontal scaling, replace with a distributed store like Redis.
#[derive(Clone)]
pub struct RateLimiter {
    requests: Arc<DashMap<String, Vec<Instant>>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: usize, window: Duration) -> Self {
        Self {
            requests: Arc::new(DashMap::new()),
            max_requests,
            window,
        }
    }

    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut entry = self
            .requests
            .entry(key.to_string())
            .or_insert_with(Vec::new);
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
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let key = req
        .extensions()
        .get::<crate::middleware::AuthContext>()
        .map(|auth| format!("tenant:{}", auth.tenant_id.as_uuid()))
        .or_else(|| {
            req.headers()
                .get("x-forwarded-for")
                .and_then(|v| v.to_str().ok())
                .map(|s| format!("ip:{}", s))
        })
        .unwrap_or_else(|| {
            req.headers()
                .get("user-agent")
                .and_then(|v| v.to_str().ok())
                .map(|s| format!("ua:{}", s))
                .unwrap_or_else(|| "unknown".to_string())
        });

    if limiter.check(&key) {
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::TOO_MANY_REQUESTS)
    }
}
