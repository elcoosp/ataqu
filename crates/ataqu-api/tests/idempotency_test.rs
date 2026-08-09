use ataqu_api::middleware::idempotency::{IDEMPOTENCY_CACHE, flush_idempotency_cache};
use ataqu_infra_idempotency::CachedResponse;
use std::collections::HashMap;

#[tokio::test]
async fn test_idempotency_cache_logic() {
    flush_idempotency_cache();
    let key = "tenant:test-key".to_string();
    assert!(IDEMPOTENCY_CACHE.get(&key).is_none());

    let cached = CachedResponse {
        status: 200,
        headers: HashMap::new(),
        body: serde_json::json!("test_response"),
    };
    IDEMPOTENCY_CACHE.insert(key.clone(), cached);
    assert!(IDEMPOTENCY_CACHE.get(&key).is_some());
    flush_idempotency_cache();
    assert!(IDEMPOTENCY_CACHE.get(&key).is_none());
}
