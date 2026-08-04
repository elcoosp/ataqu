//! Generic transactional batch insertion helper.

use sea_orm::{ConnectionTrait, DatabaseTransaction, DbErr};
use std::future::Future;
use uuid::Uuid;

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
    txn: &mut DatabaseTransaction,
    items: &[T],
    chunk_size: usize,
    insert_fn: F,
) -> Result<BatchResult<T>, DbErr>
where
    T: Clone + Send + Sync,
    F: Fn(&mut DatabaseTransaction, &[T]) -> Fut + Send + Sync,
    Fut: Future<Output = Result<(), DbErr>> + Send,
{
    let mut successes = Vec::new();
    let mut failures = Vec::new();

    for chunk in items.chunks(chunk_size) {
        txn.execute_raw(sea_orm::Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SAVEPOINT chunk_sp",
            [],
        ))
        .await?;

        let mut chunk_ok = true;
        for item in chunk {
            match insert_fn(txn, std::slice::from_ref(item)).await {
                Ok(_) => successes.push(Uuid::new_v4()), // Assuming success means we can generate a placeholder ID if needed
                Err(e) => {
                    tracing::warn!("Failed to insert item in batch: {}", e);
                    failures.push(DLQEntry {
                        item: item.clone(),
                        error: e.to_string(),
                    });
                    chunk_ok = false;
                    break;
                }
            }
        }

        if chunk_ok {
            txn.execute_raw(sea_orm::Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                "RELEASE SAVEPOINT chunk_sp",
                [],
            ))
            .await?;
        } else {
            txn.execute_raw(sea_orm::Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                "ROLLBACK TO SAVEPOINT chunk_sp",
                [],
            ))
            .await?;
        }
    }

    Ok(BatchResult {
        successes,
        failures,
    })
}
