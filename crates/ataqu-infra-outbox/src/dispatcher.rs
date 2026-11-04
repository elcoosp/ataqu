use crate::error::{DispatcherError, Result};
use crate::event::OutboxEvent;
use chrono::Utc;
use sqlx::postgres::PgListener;
use sqlx::types::Json;
use sqlx::{PgPool, Postgres, Row, Transaction};
use std::future::Future;
use std::sync::Arc;
use std::time::Duration;
use tokio::select;
use tracing::{debug, error, info, warn};

const MAX_ATTEMPTS: i32 = 5;

/// Outbox dispatcher using `sqlx::PgListener` and `FOR UPDATE SKIP LOCKED`.
pub struct OutboxDispatcher<H, F>
where
    H: Fn(OutboxEvent) -> F + Send + Sync + 'static,
    F: Future<Output = Result<()>> + Send,
{
    pool: PgPool,
    handler: Arc<H>,
    poll_interval: Duration,
}

impl<H, F> OutboxDispatcher<H, F>
where
    H: Fn(OutboxEvent) -> F + Send + Sync + 'static,
    F: Future<Output = Result<()>> + Send,
{
    pub fn new(pool: PgPool, handler: H) -> Self {
        Self {
            pool,
            handler: Arc::new(handler),
            poll_interval: Duration::from_secs(5),
        }
    }

    pub fn with_poll_interval(mut self, interval: Duration) -> Self {
        self.poll_interval = interval;
        self
    }

    pub fn poll_interval(&self) -> Duration {
        self.poll_interval
    }

    pub async fn run(&self) -> ! {
        info!("OutboxDispatcher starting");
        let mut listener = PgListener::connect_with(&self.pool)
            .await
            .unwrap_or_else(|e| {
                panic!("Failed to connect PgListener: {}", e);
            });
        listener.listen("outbox_event").await.unwrap_or_else(|e| {
            panic!("Failed to listen on outbox_event: {}", e);
        });
        info!("Listening on outbox_event");

        loop {
            select! {
                _ = tokio::time::sleep(self.poll_interval) => {
                    debug!("Periodic poll");
                    if let Err(e) = self.poll_and_process().await {
                        error!("Poll error: {}", e);
                    }
                }
                result = listener.recv() => {
                    match result {
                        Ok(notification) => {
                            debug!("Received notification: {:?}", notification);
                            if let Err(e) = self.poll_and_process().await {
                                error!("Poll error after notification: {}", e);
                            }
                        }
                        Err(e) => {
                            error!("Listener recv error: {}", e);
                            tokio::time::sleep(Duration::from_secs(1)).await;
                        }
                    }
                }
            }
        }
    }

    async fn poll_and_process(&self) -> Result<()> {
        let mut txn = self.pool.begin().await?;

        let rows = sqlx::query(
            r#"
            SELECT
                id,
                schema::text AS schema,
                event_type,
                aggregate_id,
                payload,
                status,
                priority,
                attempts,
                locked_until,
                vista_consumed_at,
                created_at,
                completed_at
            FROM core.outbox
            WHERE status = 'pending'
              AND (locked_until IS NULL OR locked_until < NOW())
            ORDER BY id
            FOR UPDATE SKIP LOCKED
            LIMIT 100
            "#,
        )
        .fetch_all(&mut *txn)
        .await?
        .into_iter()
        .map(|row| -> Result<OutboxEvent> {
            let id: i64 = row.try_get("id")?;
            let schema: String = row.try_get("schema")?;
            let event_type: String = row.try_get("event_type")?;
            let aggregate_id: Option<uuid::Uuid> = row.try_get("aggregate_id")?;
            let payload_json: Json<serde_json::Value> = row.try_get("payload")?;
            let payload = payload_json.0;
            let status: String = row.try_get("status")?;
            let priority: String = row.try_get("priority")?;
            let attempts: i32 = row.try_get("attempts")?;
            let locked_until: Option<chrono::DateTime<chrono::Utc>> =
                row.try_get("locked_until")?;
            let vista_consumed_at: Option<chrono::DateTime<chrono::Utc>> =
                row.try_get("vista_consumed_at")?;
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at")?;
            let completed_at: Option<chrono::DateTime<chrono::Utc>> =
                row.try_get("completed_at")?;

            Ok(OutboxEvent {
                id,
                schema,
                event_type,
                aggregate_id,
                payload,
                status,
                priority,
                attempts,
                locked_until,
                vista_consumed_at,
                created_at,
                completed_at,
            })
        })
        .collect::<Result<Vec<_>>>()?;

        if rows.is_empty() {
            return Ok(());
        }

        debug!("Processing {} events", rows.len());

        for event in rows {
            if event.attempts >= MAX_ATTEMPTS {
                self.mark_dlq(&mut txn, &event).await?;
                continue;
            }
            match self.process_event(&mut txn, &event).await {
                Ok(_) => {
                    debug!("Event {} processed successfully", event.id);
                }
                Err(DispatcherError::MaxAttemptsExceeded) => {
                    self.mark_dlq(&mut txn, &event).await?;
                }
                Err(e) => {
                    self.increment_attempts(&mut txn, &event).await?;
                    warn!(
                        "Event {} failed: {}, attempts now {}",
                        event.id,
                        e,
                        event.attempts + 1
                    );
                }
            }
        }

        txn.commit().await?;
        Ok(())
    }

    async fn process_event(
        &self,
        txn: &mut Transaction<'_, Postgres>,
        event: &OutboxEvent,
    ) -> Result<()> {
        // RELIABILITY (fixed in audit): a panicking handler used to unwind
        // through this spawned dispatcher task, killing it for the process
        // lifetime (no supervisor) AND rolling back the transaction so the
        // attempt counter never incremented — the same event would then crash
        // the dispatcher again on every restart, an infinite crash-loop with
        // no DLQ. The handler now runs in an isolated task; a panic is
        // converted into a normal error so attempts increment and the event
        // eventually dead-letters.
        let event_clone = event.clone();
        let handler = Arc::clone(&self.handler);
        let handler_result = tokio::spawn(async move { (handler)(event_clone).await }).await;
        match handler_result {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(e),
            Err(join_err) if join_err.is_panic() => {
                let msg = format!("event handler panicked: {join_err}");
                error!("Event {} {}", event.id, msg);
                return Err(DispatcherError::Handler(msg));
            }
            Err(join_err) => {
                return Err(DispatcherError::Handler(format!(
                    "handler task failed: {join_err}"
                )));
            }
        }
        sqlx::query(
            r#"
            UPDATE core.outbox
            SET status = 'completed',
                completed_at = $2,
                locked_until = NULL
            WHERE id = $1
            "#,
        )
        .bind(event.id)
        .bind(Utc::now())
        .execute(&mut **txn)
        .await?;
        Ok(())
    }

    async fn increment_attempts(
        &self,
        txn: &mut Transaction<'_, Postgres>,
        event: &OutboxEvent,
    ) -> Result<()> {
        let new_attempts = event.attempts + 1;
        let backoff_seconds = 2u64.pow(new_attempts as u32); // exponential backoff
        let locked_until = Utc::now() + chrono::Duration::seconds(backoff_seconds as i64);
        sqlx::query(
            r#"
            UPDATE core.outbox
            SET attempts = $2,
                locked_until = $3
            WHERE id = $1
            "#,
        )
        .bind(event.id)
        .bind(new_attempts)
        .bind(locked_until)
        .execute(&mut **txn)
        .await?;
        Ok(())
    }

    async fn mark_dlq(
        &self,
        txn: &mut Transaction<'_, Postgres>,
        event: &OutboxEvent,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE core.outbox
            SET status = 'dlq',
                completed_at = $2,
                locked_until = NULL
            WHERE id = $1
            "#,
        )
        .bind(event.id)
        .bind(Utc::now())
        .execute(&mut **txn)
        .await?;
        warn!(
            "Event {} moved to DLQ after {} attempts",
            event.id, event.attempts
        );
        Ok(())
    }
}
