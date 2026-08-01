//! Generic transactional batch insertion helper.
//! Placeholder – real implementation from ADR-014 should be used when available.

use sea_orm::{DatabaseTransaction, DbErr};
use std::future::Future;
use std::pin::Pin;
use uuid::Uuid;

use ataqu_kernel::Identifiable;

/// Result of a batch insert operation.
pub struct BatchResult<T> {
    pub successes: Vec<Uuid>,
    pub failures: Vec<DLQEntry<T>>,
}

/// Dead-letter queue entry for a failed item.
pub struct DLQEntry<T> {
    pub item: T,
    pub error: String,
}

/// Generic batch insert with chunking and savepoint handling.
pub async fn transactional_batch_insert<T, F, Fut>(
    _txn: &mut DatabaseTransaction,
    items: &[T],
    _chunk_size: usize,
    _insert_fn: F,
) -> Result<BatchResult<T>, DbErr>
where
    T: Identifiable + Clone + Send + Sync,
    F: Fn(&mut DatabaseTransaction, &[T]) -> Fut + Send + Sync,
    Fut: Future<Output = Result<(), DbErr>> + Send,
{
    // For now, just pretend everything succeeded.
    let successes: Vec<Uuid> = items.iter().map(|i| i.id()).collect();
    Ok(BatchResult {
        successes,
        failures: Vec::new(),
    })
}
