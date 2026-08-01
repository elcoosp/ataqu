//! Generic batch insertion helper with savepoints (ADR-014)
use ataqu_kernel::Identifiable;
use sea_orm::Statement;
use sea_orm::*;
use std::future::Future;
use tracing::warn;
use uuid::Uuid;

pub struct DLQEntry<T> {
    pub item: T,
    pub error: String,
}

impl<T> DLQEntry<T> {
    pub fn new(item: T, error: String) -> Self {
        Self { item, error }
    }
}

pub struct BatchResult<T> {
    pub successes: Vec<Uuid>,
    pub failures: Vec<DLQEntry<T>>,
}

impl<T> BatchResult<T> {
    pub fn partial(successes: Vec<Uuid>, failures: Vec<DLQEntry<T>>) -> Self {
        Self {
            successes,
            failures,
        }
    }
}

pub async fn transactional_batch_insert<T, F, Fut>(
    txn: &mut DatabaseTransaction,
    items: &[T],
    chunk_size: usize,
    insert_fn: F,
) -> Result<BatchResult<T>, DbErr>
where
    T: Identifiable + Clone + Send + Sync,
    F: Fn(&mut DatabaseTransaction, &[T]) -> Fut + Send + Sync,
    Fut: Future<Output = Result<(), DbErr>> + Send,
{
    let mut successes = Vec::new();
    let mut failures = Vec::new();

    for chunk in items.chunks(chunk_size) {
        txn.execute_raw(Statement::from_sql_and_values(
            DatabaseBackend::Postgres,
            "SAVEPOINT chunk_sp",
            [],
        ))
        .await?;

        match insert_fn(txn, chunk).await {
            Ok(_) => {
                txn.execute_raw(Statement::from_sql_and_values(
                    DatabaseBackend::Postgres,
                    "RELEASE SAVEPOINT chunk_sp",
                    [],
                ))
                .await?;
                successes.extend(chunk.iter().map(|i| i.id()));
            }
            Err(e) => {
                txn.execute_raw(Statement::from_sql_and_values(
                    DatabaseBackend::Postgres,
                    "ROLLBACK TO SAVEPOINT chunk_sp",
                    [],
                ))
                .await?;
                warn!("Chunk insert failed, falling back to 1-by-1: {:?}", e);
                for item in chunk {
                    txn.execute_raw(Statement::from_sql_and_values(
                        DatabaseBackend::Postgres,
                        "SAVEPOINT item_sp",
                        [],
                    ))
                    .await?;
                    match insert_fn(txn, &[item.clone()]).await {
                        Ok(_) => {
                            txn.execute_raw(Statement::from_sql_and_values(
                                DatabaseBackend::Postgres,
                                "RELEASE SAVEPOINT item_sp",
                                [],
                            ))
                            .await?;
                            successes.push(item.id());
                        }
                        Err(e) => {
                            txn.execute_raw(Statement::from_sql_and_values(
                                DatabaseBackend::Postgres,
                                "ROLLBACK TO SAVEPOINT item_sp",
                                [],
                            ))
                            .await?;
                            failures.push(DLQEntry::new(item.clone(), e.to_string()));
                        }
                    }
                }
            }
        }
    }
    Ok(BatchResult::partial(successes, failures))
}
