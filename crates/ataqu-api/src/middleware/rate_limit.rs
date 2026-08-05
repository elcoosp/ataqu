use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use moka::sync::Cache;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct RateLimiter {
    requests: Arc<Mutex<Cache<String, Vec<Instant>>>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: usize, window: Duration) -> Self {
        let requests = Cache::builder()
            .time_to_live(window)
            .build();
        Self {
            requests: Arc::new(Mutex::new(requests)),
            max_requests,
            window,
        }
    }

    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let cache = self.requests.lock().unwrap();
        let mut entry = cache.get(key).unwrap_or_default();
        entry.retain(|t| now.duration_since(*t) < self.window);
        if entry.len() >= self.max_requests {
            false
        } else {
            entry.push(now);
            cache.insert(key.to_string(), entry);
            true
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
        .unwrap_or_else(|| "unknown".to_string());

    if limiter.check(&key) {
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::TOO_MANY_REQUESTS)
    }
}
