//! Integration tests for the outbox dispatcher.
//! These tests do not require a running database; they only verify compilation
//! and basic construction.

use ataqu_infra_outbox::OutboxDispatcher;
use sqlx::PgPool;

#[tokio::test]
async fn test_dispatcher_constructs() {
    // Use connect_lazy to avoid an actual connection attempt.
    let pool = PgPool::connect_lazy("postgres://dummy").unwrap();
    let dispatcher = OutboxDispatcher::new(pool, |_event| async { Ok(()) });
    // Verify default poll interval.
    assert_eq!(
        dispatcher.poll_interval(),
        std::time::Duration::from_secs(5)
    );
}

#[tokio::test]
async fn test_dispatcher_with_custom_interval() {
    let pool = PgPool::connect_lazy("postgres://dummy").unwrap();
    let interval = std::time::Duration::from_millis(100);
    let dispatcher =
        OutboxDispatcher::new(pool, |_event| async { Ok(()) }).with_poll_interval(interval);
    assert_eq!(dispatcher.poll_interval(), interval);
}
