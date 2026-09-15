use sea_orm::{ConnectionTrait, DatabaseTransaction, DbBackend, DbErr, RuntimeErr, Statement};
use std::future::Future;
use uuid::Uuid;

pub trait Identifiable {
    fn id(&self) -> Uuid;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RepositoryError {
    UniqueViolation,
    ForeignKeyViolation,
    CheckViolation,
    Unknown,
}

impl From<&dyn sqlx::error::DatabaseError> for RepositoryError {
    fn from(db_err: &dyn sqlx::error::DatabaseError) -> Self {
        if db_err.is_unique_violation() {
            RepositoryError::UniqueViolation
        } else if db_err.is_foreign_key_violation() {
            RepositoryError::ForeignKeyViolation
        } else if db_err.is_check_violation() {
            RepositoryError::CheckViolation
        } else {
            RepositoryError::Unknown
        }
    }
}

#[derive(Debug, Clone)]
pub struct DLQEntry<T> {
    pub item: T,
    pub error: RepositoryError,
}

impl<T> DLQEntry<T> {
    pub fn new(item: T, error: RepositoryError) -> Self {
        Self { item, error }
    }
}

#[derive(Debug, Clone)]
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

pub fn extract_db_err(e: &DbErr) -> Option<&dyn sqlx::error::DatabaseError> {
    match e {
        DbErr::Query(RuntimeErr::SqlxError(arc)) => {
            if let sqlx::Error::Database(db_err) = arc.as_ref() {
                Some(db_err.as_ref())
            } else {
                None
            }
        }
        _ => None,
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
            DbBackend::Postgres,
            "SAVEPOINT chunk_sp",
            [],
        ))
        .await?;

        match insert_fn(&mut *txn, chunk).await {
            Ok(_) => {
                txn.execute_raw(Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    "RELEASE SAVEPOINT chunk_sp",
                    [],
                ))
                .await?;
                successes.extend(chunk.iter().map(|i| i.id()));
            }
            Err(e) => {
                // FIX 1: Rollback to savepoint IMMEDIATELY to restore transaction state
                txn.execute_raw(Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    "ROLLBACK TO SAVEPOINT chunk_sp",
                    [],
                ))
                .await?;

                tracing::warn!(error = ?e, "Chunk insert failed, attempting classification");

                let db_err = extract_db_err(&e);
                let is_data_violation = matches!(db_err, Some(e) if
                    e.is_unique_violation() || e.is_foreign_key_violation() || e.is_check_violation());

                if !is_data_violation {
                    // Transient error: transaction is clean, safe to return error to caller
                    return Err(e);
                }

                // Data violation: proceed 1-by-1 (transaction is already restored)
                for item in chunk {
                    txn.execute_raw(Statement::from_sql_and_values(
                        DbBackend::Postgres,
                        "SAVEPOINT item_sp",
                        [],
                    ))
                    .await?;
                    match insert_fn(&mut *txn, std::slice::from_ref(item)).await {
                        Ok(_) => {
                            txn.execute_raw(Statement::from_sql_and_values(
                                DbBackend::Postgres,
                                "RELEASE SAVEPOINT item_sp",
                                [],
                            ))
                            .await?;
                            successes.push(item.id());
                        }
                        Err(e) => {
                            txn.execute_raw(Statement::from_sql_and_values(
                                DbBackend::Postgres,
                                "ROLLBACK TO SAVEPOINT item_sp",
                                [],
                            ))
                            .await?;

                            // FIX 2: Idiomatic Option handling for error mapping
                            let repo_err = extract_db_err(&e)
                                .map(RepositoryError::from)
                                .unwrap_or(RepositoryError::Unknown);

                            // FIX 3: Clone the item to preserve the DLQ payload
                            failures.push(DLQEntry::new(item.clone(), repo_err));
                        }
                    }
                }
            }
        }
    }
    Ok(BatchResult::partial(successes, failures))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fmt;
    use std::sync::Arc;

    struct MockDbError {
        unique: bool,
        fk: bool,
        check: bool,
    }

    impl fmt::Display for MockDbError {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            write!(f, "mock")
        }
    }
    impl fmt::Debug for MockDbError {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            write!(f, "mock")
        }
    }
    impl std::error::Error for MockDbError {}

    impl sqlx::error::DatabaseError for MockDbError {
        fn message(&self) -> &str {
            "mock"
        }
        fn code(&self) -> Option<std::borrow::Cow<'_, str>> {
            None
        }
        fn as_error(&self) -> &(dyn std::error::Error + Send + Sync + 'static) {
            self
        }
        fn as_error_mut(&mut self) -> &mut (dyn std::error::Error + Send + Sync + 'static) {
            self
        }
        fn into_error(self: Box<Self>) -> Box<dyn std::error::Error + Send + Sync + 'static> {
            self
        }
        fn kind(&self) -> sqlx::error::ErrorKind {
            sqlx::error::ErrorKind::Other
        }
        fn is_unique_violation(&self) -> bool {
            self.unique
        }
        fn is_foreign_key_violation(&self) -> bool {
            self.fk
        }
        fn is_check_violation(&self) -> bool {
            self.check
        }
    }

    fn create_db_err(mock: MockDbError) -> DbErr {
        DbErr::Query(RuntimeErr::SqlxError(Arc::new(sqlx::Error::Database(
            Box::new(mock),
        ))))
    }

    #[test]
    fn test_extract_and_classify_unique_violation() {
        let mock = MockDbError {
            unique: true,
            fk: false,
            check: false,
        };
        let db_err = create_db_err(mock);
        let extracted = extract_db_err(&db_err).unwrap();
        let repo_err = RepositoryError::from(extracted);
        assert_eq!(repo_err, RepositoryError::UniqueViolation);
    }

    #[test]
    fn test_extract_and_classify_fk_violation() {
        let mock = MockDbError {
            unique: false,
            fk: true,
            check: false,
        };
        let db_err = create_db_err(mock);
        let extracted = extract_db_err(&db_err).unwrap();
        let repo_err = RepositoryError::from(extracted);
        assert_eq!(repo_err, RepositoryError::ForeignKeyViolation);
    }

    #[test]
    fn test_extract_and_classify_check_violation() {
        let mock = MockDbError {
            unique: false,
            fk: false,
            check: true,
        };
        let db_err = create_db_err(mock);
        let extracted = extract_db_err(&db_err).unwrap();
        let repo_err = RepositoryError::from(extracted);
        assert_eq!(repo_err, RepositoryError::CheckViolation);
    }

    #[test]
    fn test_extract_returns_none_for_non_db_err() {
        let db_err = DbErr::Custom("some custom error".to_string());
        assert!(extract_db_err(&db_err).is_none());
    }

    #[test]
    fn test_dlq_entry_payload_preserved() {
        #[derive(Debug, Clone, PartialEq)]
        struct TestItem {
            id: Uuid,
            data: String,
        }
        impl Identifiable for TestItem {
            fn id(&self) -> Uuid {
                self.id
            }
        }

        let item = TestItem {
            id: Uuid::new_v4(),
            data: "payload".to_string(),
        };
        let entry = DLQEntry::new(item.clone(), RepositoryError::Unknown);

        assert_eq!(entry.item, item);
        assert_eq!(entry.error, RepositoryError::Unknown);
    }

    #[test]
    fn test_batch_result_partial() {
        let successes = vec![Uuid::new_v4(), Uuid::new_v4()];
        let failures = vec![];
        let result = BatchResult::<String>::partial(successes, failures);
        assert_eq!(result.successes.len(), 2);
        assert_eq!(result.failures.len(), 0);
    }
}
