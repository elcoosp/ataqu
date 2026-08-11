//! Idempotency record store abstraction and SeaORM implementation.

use async_trait::async_trait;
use sea_orm::{ConnectionTrait, DatabaseTransaction, DbBackend, DbErr, Statement, Value};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// The status of an idempotency record.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IdempotencyStatus {
    InProgress,
    Completed,
    Failed,
}

impl IdempotencyStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            IdempotencyStatus::InProgress => "in_progress",
            IdempotencyStatus::Completed => "completed",
            IdempotencyStatus::Failed => "failed",
        }
    }
}

/// A cached HTTP response to be returned for idempotent requests.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: serde_json::Value,
}

/// A record from the idempotency table.
#[derive(Debug, Clone)]
pub struct IdempotencyRecord {
    pub command_id: Uuid,
    pub status: IdempotencyStatus,
    pub response: Option<CachedResponse>,
    pub aggregate_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Error type for store operations.
#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("database error: {0}")]
    Database(#[from] DbErr),
    #[error("record not found")]
    NotFound,
    #[error("unexpected status: {0}")]
    UnexpectedStatus(String),
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Abstraction over the idempotency record storage.
#[async_trait]
pub trait IdempotencyStore: Send + Sync {
    /// Fetch a record by command_id.
    async fn get(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
    ) -> Result<Option<IdempotencyRecord>, StoreError>;

    /// Insert a new record with status 'in_progress'.
    async fn insert_in_progress(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
        aggregate_id: Option<Uuid>,
    ) -> Result<(), StoreError>;

    /// Update record to 'completed' with response.
    async fn update_completed(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
        response: &CachedResponse,
        aggregate_id: Option<Uuid>,
    ) -> Result<(), StoreError>;

    /// Update record to 'failed' (no response body).
    async fn update_failed(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
    ) -> Result<(), StoreError>;

    /// Delete a record (used when stale 'in_progress' found).
    async fn delete(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
    ) -> Result<(), StoreError>;
}

/// SeaORM implementation of IdempotencyStore.
#[derive(Default)]
pub struct SeaOrmIdempotencyStore;

impl SeaOrmIdempotencyStore {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl IdempotencyStore for SeaOrmIdempotencyStore {
    async fn get(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
    ) -> Result<Option<IdempotencyRecord>, StoreError> {
        let sql = r#"
            SELECT
                command_id,
                status,
                response_status,
                response_body,
                response_headers,
                aggregate_id,
                created_at,
                completed_at
            FROM core.idempotency_records
            WHERE command_id = $1
        "#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![command_id.as_bytes().to_vec().into()],
        );
        let row = txn.query_one_raw(stmt).await?;
        if let Some(row) = row {
            let status_str: String = row.try_get("", "status")?;
            let status = match status_str.as_str() {
                "in_progress" => IdempotencyStatus::InProgress,
                "completed" => IdempotencyStatus::Completed,
                "failed" => IdempotencyStatus::Failed,
                _ => return Err(StoreError::UnexpectedStatus(status_str)),
            };
            let response = if status == IdempotencyStatus::Completed {
                let status_code: i16 = row.try_get("", "response_status")?;
                let body: serde_json::Value = row.try_get("", "response_body")?;
                let headers: serde_json::Value = row.try_get("", "response_headers")?;
                let headers_map: HashMap<String, String> = serde_json::from_value(headers)
                    .map_err(|_| StoreError::UnexpectedStatus("headers json".to_string()))?;
                Some(CachedResponse {
                    status: status_code as u16,
                    headers: headers_map,
                    body,
                })
            } else {
                None
            };
            let aggregate_id: Option<Uuid> = row.try_get("", "aggregate_id")?;
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("", "created_at")?;
            let completed_at: Option<chrono::DateTime<chrono::Utc>> =
                row.try_get("", "completed_at")?;
            Ok(Some(IdempotencyRecord {
                command_id: *command_id,
                status,
                response,
                aggregate_id,
                created_at,
                completed_at,
            }))
        } else {
            Ok(None)
        }
    }

    async fn insert_in_progress(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
        _aggregate_id: Option<Uuid>,
    ) -> Result<(), StoreError> {
        let sql = r#"
            INSERT INTO core.idempotency_records (command_id, status, aggregate_id, created_at)
            VALUES ($1, 'in_progress', $2, NOW())
        "#;
        let agg_val = _aggregate_id
            .map(|id| Value::Bytes(Some(id.as_bytes().to_vec())))
            .unwrap_or(Value::Bytes(None));
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![command_id.as_bytes().to_vec().into(), agg_val],
        );
        txn.execute_raw(stmt).await?;
        Ok(())
    }

    async fn update_completed(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
        response: &CachedResponse,
        _aggregate_id: Option<Uuid>,
    ) -> Result<(), StoreError> {
        let sql = r#"
            UPDATE core.idempotency_records
            SET status = 'completed',
                response_status = $2,
                response_body = $3,
                response_headers = $4,
                aggregate_id = COALESCE($5, aggregate_id),
                completed_at = NOW()
            WHERE command_id = $1
        "#;
        let headers_json = serde_json::to_value(&response.headers)?;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![
                command_id.as_bytes().to_vec().into(),
                (response.status as i16).into(),
                response.body.clone().into(),
                headers_json.into(),
            ],
        );
        txn.execute_raw(stmt).await?;
        Ok(())
    }

    async fn update_failed(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
    ) -> Result<(), StoreError> {
        let sql = r#"
            UPDATE core.idempotency_records
            SET status = 'failed', completed_at = NOW()
            WHERE command_id = $1
        "#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![command_id.as_bytes().to_vec().into()],
        );
        txn.execute_raw(stmt).await?;
        Ok(())
    }

    async fn delete(
        &self,
        txn: &mut DatabaseTransaction,
        command_id: &Uuid,
    ) -> Result<(), StoreError> {
        let sql = r#"DELETE FROM core.idempotency_records WHERE command_id = $1"#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![command_id.as_bytes().to_vec().into()],
        );
        txn.execute_raw(stmt).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_as_str() {
        assert_eq!(IdempotencyStatus::InProgress.as_str(), "in_progress");
        assert_eq!(IdempotencyStatus::Completed.as_str(), "completed");
        assert_eq!(IdempotencyStatus::Failed.as_str(), "failed");
    }
}
