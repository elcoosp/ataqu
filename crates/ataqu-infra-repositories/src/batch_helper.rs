use sea_orm::{ConnectionTrait, DatabaseTransaction, DbBackend, DbErr, Statement};
use serde::Serialize;
use tracing::warn;

pub struct BatchResult {
    pub successes: Vec<uuid::Uuid>,
    pub failures: Vec<DLQEntry>,
}

pub struct DLQEntry {
    pub item: serde_json::Value,
    pub error: String,
}

#[allow(clippy::collapsible_if)]
pub async fn transactional_batch_insert<T, F, Fut>(
    txn: &DatabaseTransaction,
    items: &[T],
    chunk_size: usize,
    insert_fn: F,
) -> Result<BatchResult, DbErr>
where
    T: Serialize + Clone + Send + Sync,
    F: Fn(&DatabaseTransaction, &[T]) -> Fut + Send + Sync,
    Fut: std::future::Future<Output = Result<(), DbErr>> + Send,
{
    let mut successes = Vec::new();
    let mut failures = Vec::new();

    for chunk in items.chunks(chunk_size) {
        txn.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SAVEPOINT chunk_sp",
            [],
        ))
        .await?;

        match insert_fn(txn, chunk).await {
            Ok(_) => {
                txn.execute_raw(Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    "RELEASE SAVEPOINT chunk_sp",
                    [],
                ))
                .await?;
                for item in chunk {
                    if let Ok(val) = serde_json::to_value(item) {
                        if let Some(id) = val
                            .get("id")
                            .and_then(|v| v.as_str())
                            .and_then(|s| uuid::Uuid::parse_str(s).ok())
                        {
                            successes.push(id);
                        }
                    }
                }
            }
            Err(e) => {
                txn.execute_raw(Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    "ROLLBACK TO SAVEPOINT chunk_sp",
                    [],
                ))
                .await?;

                warn!(error = ?e, "Chunk insert failed, attempting 1-by-1 fallback");

                for item in chunk {
                    txn.execute_raw(Statement::from_sql_and_values(
                        DbBackend::Postgres,
                        "SAVEPOINT item_sp",
                        [],
                    ))
                    .await?;
                    match insert_fn(txn, std::slice::from_ref(item)).await {
                        Ok(_) => {
                            txn.execute_raw(Statement::from_sql_and_values(
                                DbBackend::Postgres,
                                "RELEASE SAVEPOINT item_sp",
                                [],
                            ))
                            .await?;
                            if let Ok(val) = serde_json::to_value(item) {
                                if let Some(id) = val
                                    .get("id")
                                    .and_then(|v| v.as_str())
                                    .and_then(|s| uuid::Uuid::parse_str(s).ok())
                                {
                                    successes.push(id);
                                }
                            }
                        }
                        Err(e) => {
                            txn.execute_raw(Statement::from_sql_and_values(
                                DbBackend::Postgres,
                                "ROLLBACK TO SAVEPOINT item_sp",
                                [],
                            ))
                            .await?;
                            let item_json = serde_json::to_value(item).unwrap_or_default();
                            failures.push(DLQEntry {
                                item: item_json,
                                error: e.to_string(),
                            });
                        }
                    }
                }
            }
        }
    }
    Ok(BatchResult {
        successes,
        failures,
    })
}
