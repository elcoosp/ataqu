use sea_orm::{ConnectionTrait, DatabaseTransaction, DbBackend, DbErr, Statement};
use uuid::Uuid;

#[derive(Default)]
pub struct VistaRepository;

impl VistaRepository {
    pub fn new() -> Self {
        Self
    }

    /// Polls the outbox for VISTA events that are completed but not yet consumed.
    /// Uses FOR UPDATE SKIP LOCKED to avoid contention.
    pub async fn poll_outbox(
        &self,
        txn: &mut DatabaseTransaction,
        limit: i64,
    ) -> Result<Vec<VistaOutboxItem>, DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, schema, event_type, aggregate_id, payload, status, attempts
            FROM core.outbox
            WHERE vista_consumed_at IS NULL
              AND status = 'completed'
            ORDER BY id ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
            "#,
            vec![limit.into()],
        );

        let rows = txn.query_all_raw(stmt).await?;

        let mut items = Vec::with_capacity(rows.len());
        for row in rows {
            items.push(VistaOutboxItem {
                id: row.try_get("", "id")?,
                schema: row.try_get("", "schema")?,
                event_type: row.try_get("", "event_type")?,
                aggregate_id: row.try_get("", "aggregate_id")?,
                payload: row.try_get("", "payload")?,
                status: row.try_get("", "status")?,
                attempts: row.try_get("", "attempts")?,
            });
        }

        Ok(items)
    }

    /// Marks the outbox item as consumed by VISTA.
    pub async fn mark_consumed(&self, txn: &mut DatabaseTransaction, id: i64) -> Result<(), DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE core.outbox
            SET vista_consumed_at = NOW()
            WHERE id = $1
            "#,
            vec![id.into()],
        );
        txn.execute_raw(stmt).await?;
        Ok(())
    }

    /// Moves the outbox item to DLQ on failure.
    pub async fn mark_dlq(&self, txn: &mut DatabaseTransaction, id: i64) -> Result<(), DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE core.outbox
            SET status = 'dlq',
                attempts = attempts + 1,
                locked_until = NOW() + INTERVAL '1 hour'
            WHERE id = $1
            "#,
            vec![id.into()],
        );
        txn.execute_raw(stmt).await?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct VistaOutboxItem {
    pub id: i64,
    pub schema: String,
    pub event_type: String,
    pub aggregate_id: Option<Uuid>,
    pub payload: serde_json::Value,
    pub status: String,
    pub attempts: i32,
}
