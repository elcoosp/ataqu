use ataqu_kernel::Identifiable;
use sea_orm::{
    ConnectionTrait, DatabaseBackend, DatabaseTransaction, DbErr, RuntimeErr, Statement,
};
use std::future::Future;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct DLQEntry<T: Clone> {
    pub item: T,
    pub error: String,
}

impl<T: Clone> DLQEntry<T> {
    pub fn new(item: T, error: String) -> Self {
        Self { item, error }
    }
}

#[derive(Debug, Clone)]
pub struct BatchResult<T: Clone> {
    pub successes: Vec<Uuid>,
    pub failures: Vec<DLQEntry<T>>,
}

impl<T: Clone> BatchResult<T> {
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

        match insert_fn(&mut *txn, chunk).await {
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

                let is_data_violation = match &e {
                    DbErr::Query(RuntimeErr::SqlxError(arc)) => {
                        if let sqlx::Error::Database(db_err) = arc.as_ref() {
                            db_err.is_unique_violation()
                                || db_err.is_foreign_key_violation()
                                || db_err.is_check_violation()
                        } else {
                            false
                        }
                    }
                    _ => false,
                };

                if !is_data_violation {
                    return Err(e);
                }

                for item in chunk {
                    txn.execute_raw(Statement::from_sql_and_values(
                        DatabaseBackend::Postgres,
                        "SAVEPOINT item_sp",
                        [],
                    ))
                    .await?;
                    match insert_fn(&mut *txn, std::slice::from_ref(item)).await {
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
