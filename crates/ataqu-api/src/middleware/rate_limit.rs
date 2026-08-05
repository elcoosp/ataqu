use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

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
        let mut entry = self.requests.entry(key.to_string()).or_insert_with(Vec::new);
        entry.retain(|t| now.duration_since(*t) < self.window);
        if entry.len() >= self.max_requests {
            false
        } else {
            entry.push(now);
            true
        }
    }
}

pub async fn rate_limit_middleware(
    State(limiter): State<RateLimiter>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Try to extract tenant_id from extension (set by auth middleware)
    // If not present, fall back to IP.
    let key = req.extensions().get::<crate::middleware::AuthContext>()
        .map(|auth| format!("tenant:{}", auth.tenant_id.as_uuid()))
        .or_else(|| {
            req.headers().get("x-forwarded-for")
                .and_then(|v| v.to_str().ok())
                .map(|s| format!("ip:{}", s))
        })
        .unwrap_or_else(|| "unknown".to_string());

    if limiter.check(&key) {
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::TOO_MANY_REQUESTS)
    }
}
