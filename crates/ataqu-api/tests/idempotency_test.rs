use ataqu_api::middleware::idempotency::{flush_idempotency_cache, IDEMPOTENCY_CACHE};
use uuid::Uuid;

#[tokio::test]
async fn test_idempotency_cache_logic() {
    flush_idempotency_cache();
    let key = Uuid::new_v4();
    assert!(IDEMPOTENCY_CACHE.get(&key).is_none());

    // Simulate middleware inserting a response
    IDEMPOTENCY_CACHE.insert(
        key,
        (
            axum::http::StatusCode::OK,
            axum::http::HeaderMap::new(),
            b"test_response".to_vec(),
        ),
    );
    assert!(IDEMPOTENCY_CACHE.get(&key).is_some());
    flush_idempotency_cache();
}
