use ataqu_api::middleware::idempotency::{IDEMPOTENCY_CACHE, flush_idempotency_cache};

#[tokio::test]
async fn test_idempotency_cache_logic() {
    flush_idempotency_cache();
    let key = "tenant:test-key".to_string();
    assert!(IDEMPOTENCY_CACHE.get(&key).is_none());

    IDEMPOTENCY_CACHE.insert(
        key.clone(),
        (
            axum::http::StatusCode::OK,
            axum::http::HeaderMap::new(),
            b"test_response".to_vec(),
        ),
    );
    assert!(IDEMPOTENCY_CACHE.get(&key).is_some());
    flush_idempotency_cache();
}
