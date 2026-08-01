//! Idempotency guard that manages the advisory lock and state transitions.

#![allow(unused_imports)]

use crate::store::{
    CachedResponse, IdempotencyStatus, IdempotencyStore, SeaOrmIdempotencyStore, StoreError,
};
use sea_orm::{
    ConnectionTrait, DatabaseConnection, DatabaseTransaction, DbBackend, DbErr, Statement,
    TransactionTrait,
};
use tracing::{debug, error, instrument, warn};
use uuid::Uuid;

/// Split a UUID into two i32 values for PostgreSQL advisory lock.
/// Uses the first 8 bytes of the UUID to produce two 32-bit integers.
pub fn split_uuid_to_int4_pair(uuid: &Uuid) -> (i32, i32) {
    let bytes = uuid.as_bytes();
    let high = i32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
    let low = i32::from_be_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]);
    (high, low)
}

/// Error types for the idempotency guard.
#[derive(Debug, thiserror::Error)]
pub enum IdempotencyError {
    #[error("lock acquisition timed out after 10s")]
    LockTimeout,
    #[error("database error: {0}")]
    Database(#[from] DbErr),
    #[error("store error: {0}")]
    Store(#[from] StoreError),
    #[error("idempotency key conflict (failed previous attempt)")]
    Conflict,
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Result type for idempotency operations.
pub type IdempotencyResult<T> = Result<T, IdempotencyError>;

/// The result of acquiring the guard: either a cached response (if already completed)
/// or the guard itself to proceed with the operation.
pub enum AcquireOutcome {
    /// The request has already been completed; return this cached response.
    Completed(CachedResponse),
    /// No cached response; proceed with the operation using the guard.
    Proceed(IdempotencyGuard),
}

/// Idempotency guard holds the transaction and the acquired lock.
pub struct IdempotencyGuard {
    txn: DatabaseTransaction,
    command_id: Uuid,
    store: Box<dyn IdempotencyStore>,
}

impl IdempotencyGuard {
    /// Acquire the idempotency lock for the given command_id.
    /// This will start a transaction, set timeouts, acquire advisory lock,
    /// check existing record, and either return a cached response or a guard.
    #[instrument(skip(conn, store), fields(command_id = %command_id))]
    pub async fn acquire(
        conn: &DatabaseConnection,
        command_id: Uuid,
        store: Option<Box<dyn IdempotencyStore>>,
    ) -> IdempotencyResult<AcquireOutcome> {
        // Start transaction
        let mut txn = conn.begin().await?;

        // Set statement_timeout to 10s for lock acquisition
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SET LOCAL statement_timeout = '10s'",
            [],
        );
        txn.execute_raw(stmt).await?;

        // Acquire advisory lock (explicit ::int4 cast)
        let (key1, key2) = split_uuid_to_int4_pair(&command_id);
        let lock_sql = "SELECT pg_advisory_xact_lock($1::int4, $2::int4)";
        let lock_stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            lock_sql,
            vec![key1.into(), key2.into()],
        );
        match txn.execute_raw(lock_stmt).await {
            Ok(_) => {
                debug!(command_id = %command_id, "Advisory lock acquired");
            }
            Err(e) => {
                // Check if it's a timeout error (PostgreSQL error code 57014)
                // We use string matching on the error representation as a pragmatic fallback
                // because direct type-based detection is challenging with the current SeaORM version.
                if let DbErr::Query(sqlx_err) = &e {
                    let err_str = sqlx_err.to_string();
                    if err_str.contains("57014") || err_str.contains("statement timeout") {
                        warn!(command_id = %command_id, "Lock acquisition timed out");
                        // Rollback transaction before returning timeout
                        txn.rollback().await?;
                        return Err(IdempotencyError::LockTimeout);
                    }
                }
                return Err(IdempotencyError::Database(e));
            }
        }

        // After lock acquired, set statement_timeout to 5s for subsequent queries
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SET LOCAL statement_timeout = '5s'",
            [],
        );
        txn.execute_raw(stmt).await?;

        // Use the provided store or default to SeaORM implementation
        let store: Box<dyn IdempotencyStore> =
            store.unwrap_or_else(|| Box::new(SeaOrmIdempotencyStore::new()));

        // Check existing record
        let record = store.get(&mut txn, &command_id).await?;

        match record {
            Some(rec) => {
                match rec.status {
                    IdempotencyStatus::Completed => {
                        // Check if response exists before committing
                        if let Some(response) = rec.response {
                            // Cached response found; commit transaction and return it.
                            txn.commit().await?;
                            debug!(command_id = %command_id, "Idempotency cache hit (DB)");
                            Ok(AcquireOutcome::Completed(response))
                        } else {
                            // Should not happen for completed status; treat as error.
                            error!(command_id = %command_id, "Completed record missing response");
                            txn.rollback().await?;
                            Err(IdempotencyError::Store(StoreError::UnexpectedStatus(
                                "completed record missing response".to_string(),
                            )))
                        }
                    }
                    IdempotencyStatus::Failed => {
                        // Previous attempt failed; conflict.
                        txn.rollback().await?;
                        warn!(command_id = %command_id, "Previous attempt failed, returning conflict");
                        Err(IdempotencyError::Conflict)
                    }
                    IdempotencyStatus::InProgress => {
                        // Stale in_progress; delete and proceed.
                        warn!(command_id = %command_id, "Stale in_progress record found, deleting");
                        store.delete(&mut txn, &command_id).await?;
                        // Now insert new in_progress
                        store
                            .insert_in_progress(&mut txn, &command_id, None)
                            .await?;
                        // Return guard
                        Ok(AcquireOutcome::Proceed(IdempotencyGuard {
                            txn,
                            command_id,
                            store,
                        }))
                    }
                }
            }
            None => {
                // No record; insert in_progress and return guard.
                store
                    .insert_in_progress(&mut txn, &command_id, None)
                    .await?;
                Ok(AcquireOutcome::Proceed(IdempotencyGuard {
                    txn,
                    command_id,
                    store,
                }))
            }
        }
    }

    /// Get a mutable reference to the transaction for the caller to perform domain operations.
    pub fn transaction(&mut self) -> &mut DatabaseTransaction {
        &mut self.txn
    }

    /// Complete the idempotent request with a successful response.
    /// This updates the record, commits the transaction, and returns the cached response.
    #[instrument(skip(self), fields(command_id = %self.command_id))]
    pub async fn complete(mut self, response: CachedResponse) -> IdempotencyResult<CachedResponse> {
        self.store
            .update_completed(&mut self.txn, &self.command_id, &response)
            .await?;
        self.txn.commit().await?;
        debug!(command_id = %self.command_id, "Idempotent request completed");
        Ok(response)
    }

    /// Fail the idempotent request (validation error, etc.).
    /// Updates the record to 'failed' and commits the transaction.
    #[instrument(skip(self), fields(command_id = %self.command_id))]
    pub async fn fail(mut self) -> IdempotencyResult<()> {
        self.store
            .update_failed(&mut self.txn, &self.command_id)
            .await?;
        self.txn.commit().await?;
        debug!(command_id = %self.command_id, "Idempotent request failed");
        Ok(())
    }

    /// Abort the transaction without updating the record (e.g., on transient error).
    /// Rolls back the transaction.
    #[instrument(skip(self), fields(command_id = %self.command_id))]
    pub async fn abort(self) -> IdempotencyResult<()> {
        self.txn.rollback().await?;
        debug!(command_id = %self.command_id, "Idempotent request aborted (rollback)");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_uuid_works() {
        let uuid = Uuid::parse_str("12345678-1234-1234-1234-123456789012").unwrap();
        let (h, l) = split_uuid_to_int4_pair(&uuid);
        assert_eq!(h, 0x12345678i32);
        assert_eq!(l, 0x12341234i32);
    }
}
