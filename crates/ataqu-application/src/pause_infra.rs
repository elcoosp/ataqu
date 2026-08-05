//! Real infrastructure implementations for PAUSE (idempotency, outbox)
use async_trait::async_trait;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement, TransactionTrait};
use serde_json::Value;
use uuid::Uuid;

use crate::pause_service::{IdempotencyGuardHandle, IdempotencyPort, PauseServiceError};
use ataqu_infra_idempotency::{
    CachedResponse, IdempotencyStore, SeaOrmIdempotencyStore, guard::split_uuid_to_int4_pair,
};

/// Real Idempotency using the idempotency infrastructure crate
pub struct RealIdempotency {
    db: DatabaseConnection,
}

impl RealIdempotency {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl IdempotencyPort for RealIdempotency {
    async fn acquire(
        &self,
        command_id: &Uuid,
    ) -> Result<IdempotencyGuardHandle, PauseServiceError> {
        let store = SeaOrmIdempotencyStore::new();
        let (key1, key2) = split_uuid_to_int4_pair(command_id);

        // Acquire session-level advisory lock to span the entire business transaction
        let lock_stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT pg_advisory_lock($1::int4, $2::int4)",
            vec![key1.into(), key2.into()],
        );
        self.db
            .execute_raw(lock_stmt)
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;

        let mut txn = self
            .db
            .begin()
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;

        // Try to get existing record
        let record = store
            .get(&mut txn, command_id)
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
        if let Some(rec) = record {
            if rec.status == ataqu_infra_idempotency::IdempotencyStatus::Completed {
                if let Some(resp) = rec.response {
                    txn.commit()
                        .await
                        .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                    let cached_value = serde_json::to_value(resp)
                        .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;

                    // Release session lock before returning
                    let unlock_stmt = Statement::from_sql_and_values(
                        DbBackend::Postgres,
                        "SELECT pg_advisory_unlock($1::int4, $2::int4)",
                        vec![key1.into(), key2.into()],
                    );
                    let _ = self.db.execute_raw(unlock_stmt).await;

                    return Ok(IdempotencyGuardHandle::new(Some(cached_value)));
                }
            } else if rec.status == ataqu_infra_idempotency::IdempotencyStatus::Failed {
                txn.rollback()
                    .await
                    .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;

                let unlock_stmt = Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    "SELECT pg_advisory_unlock($1::int4, $2::int4)",
                    vec![key1.into(), key2.into()],
                );
                let _ = self.db.execute_raw(unlock_stmt).await;

                return Err(PauseServiceError::Idempotency(
                    "Previous attempt failed".to_string(),
                ));
            } else {
                // InProgress – treat as stale and delete
                store
                    .delete(&mut txn, command_id)
                    .await
                    .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
            }
        }
        // Insert in_progress
        store
            .insert_in_progress(&mut txn, command_id, None)
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
        txn.commit()
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
        // Return a handle with no cached response. Lock is still held.
        Ok(IdempotencyGuardHandle::new(None))
    }

    async fn commit(
        &self,
        command_id: &Uuid,
        response_body: Value,
    ) -> Result<(), PauseServiceError> {
        let store = SeaOrmIdempotencyStore::new();
        let mut txn = self
            .db
            .begin()
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
        let response = CachedResponse {
            status: 200, // OK
            headers: std::collections::HashMap::new(),
            body: response_body,
        };
        store
            .update_completed(&mut txn, command_id, &response)
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
        txn.commit()
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;

        // Release session lock
        let (key1, key2) = split_uuid_to_int4_pair(command_id);
        let unlock_stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT pg_advisory_unlock($1::int4, $2::int4)",
            vec![key1.into(), key2.into()],
        );
        let _ = self.db.execute_raw(unlock_stmt).await;

        Ok(())
    }

    async fn rollback(&self, command_id: &Uuid) -> Result<(), PauseServiceError> {
        let store = SeaOrmIdempotencyStore::new();
        let mut txn = self
            .db
            .begin()
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
        store
            .update_failed(&mut txn, command_id)
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
        txn.commit()
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;

        // Release session lock
        let (key1, key2) = split_uuid_to_int4_pair(command_id);
        let unlock_stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT pg_advisory_unlock($1::int4, $2::int4)",
            vec![key1.into(), key2.into()],
        );
        let _ = self.db.execute_raw(unlock_stmt).await;

        Ok(())
    }
}
