//! Real infrastructure implementations for PAUSE (idempotency, outbox)
use async_trait::async_trait;
use sea_orm::{DatabaseConnection, TransactionTrait};
use serde_json::Value;
use uuid::Uuid;

use crate::pause_service::{IdempotencyGuardHandle, IdempotencyPort, PauseServiceError};
use ataqu_infra_idempotency::{CachedResponse, IdempotencyStore, SeaOrmIdempotencyStore};

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
        let mut txn = self
            .db
            .begin()
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;

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
                    return Ok(IdempotencyGuardHandle::new(Some(cached_value)));
                }
            } else if rec.status == ataqu_infra_idempotency::IdempotencyStatus::Failed {
                txn.rollback()
                    .await
                    .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                return Err(PauseServiceError::Idempotency(
                    "Previous attempt failed".to_string(),
                ));
            } else {
                // InProgress – concurrent request
                txn.rollback()
                    .await
                    .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
                return Err(PauseServiceError::Idempotency(
                    "Request already in progress".to_string(),
                ));
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
            status: 200,
            headers: std::collections::HashMap::new(),
            body: response_body,
        };
        store
            .update_completed(&mut txn, command_id, &response, None)
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
        txn.commit()
            .await
            .map_err(|e| PauseServiceError::Idempotency(e.to_string()))?;
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
        Ok(())
    }
}
