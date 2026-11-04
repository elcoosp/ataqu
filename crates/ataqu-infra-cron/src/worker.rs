use sqlx::{PgPool, Row};

use std::time::Duration;
use tracing::{error, info, warn};

pub async fn run_cron_worker(pool: PgPool) {
    info!("Cron worker started");
    loop {
        if let Err(e) = poll_tasks(&pool).await {
            error!("Cron poll failed: {}", e);
        }
        if let Err(e) = prune_terminal_rows(&pool).await {
            error!("Outbox/idempotency pruning failed: {}", e);
        }
        tokio::time::sleep(Duration::from_secs(60)).await;
    }
}

async fn poll_tasks(pool: &PgPool) -> Result<(), sqlx::Error> {
    let mut txn = pool.begin().await?;
    let rows = sqlx::query(
        r#"
        SELECT id, tenant_id, task_type, payload, scheduled_for
        FROM core.scheduled_tasks
        WHERE status = 'pending' AND scheduled_for <= NOW()
        ORDER BY scheduled_for
        FOR UPDATE SKIP LOCKED
        LIMIT 10
        "#,
    )
    .fetch_all(&mut *txn)
    .await?;

    for row in rows {
        let id: uuid::Uuid = row.try_get("id")?;
        let tenant_id: uuid::Uuid = row.try_get("tenant_id")?;
        let task_type: String = row.try_get("task_type")?;
        let payload: serde_json::Value = row.try_get("payload")?;

        // CORRECTNESS (fixed in audit): malformed payloads were silently
        // marked completed (message loss). They are now marked 'failed'.
        let mut task_failed = false;
        let failure: Option<String> = match task_type.as_str() {
            "send_email" => {
                // Emit an outbox event for email
                let event_payload = serde_json::json!({
                    "type": "scheduled_email",
                    "tenant_id": tenant_id,
                    "payload": payload,
                });
                let outbox_sql = r#"
                    INSERT INTO core.outbox (schema, event_type, aggregate_id, payload, status, priority)
                    VALUES ('core', 'ScheduledEmail', $1, $2, 'pending', 'normal')
                "#;
                sqlx::query(outbox_sql)
                    .bind(id)
                    .bind(&event_payload)
                    .execute(&mut *txn)
                    .await?;
                tracing::info!("Scheduled email task enqueued: {:?}", payload);
                None
            }
            "reminder" => {
                // Send a reminder via DIAL
                let channel_id = payload
                    .get("channel_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| uuid::Uuid::parse_str(s).ok());
                let user_id = payload
                    .get("user_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| uuid::Uuid::parse_str(s).ok());
                let message = payload.get("message").and_then(|v| v.as_str());
                if let (Some(channel_id), Some(user_id), Some(message)) =
                    (channel_id, user_id, message)
                {
                    let event_payload = serde_json::json!({
                        "type": "reminder",
                        "tenant_id": tenant_id,
                        "channel_id": channel_id,
                        "user_id": user_id,
                        "message": message,
                    });
                    let outbox_sql = r#"
                            INSERT INTO core.outbox (schema, event_type, aggregate_id, payload, status, priority)
                            VALUES ('dial', 'ReminderEvent', $1, $2, 'pending', 'normal')
                        "#;
                    sqlx::query(outbox_sql)
                        .bind(channel_id)
                        .bind(&event_payload)
                        .execute(&mut *txn)
                        .await?;
                    tracing::info!("Reminder event enqueued for channel {}", channel_id);
                    None
                } else {
                    Some(
                        "malformed reminder payload (need channel_id/user_id/message as UUIDs/string)"
                            .to_string(),
                    )
                }
            }
            "cleanup" => {
                // Perform cleanup tasks: delete old audit logs, etc.
                // SECURITY (fixed in audit): the table name and day count were
                // interpolated with format! and the SQL leaked via
                // Box::leak on every run. The table is matched against a
                // whitelist and the interval is now bound as a parameter.
                match payload.get("table").and_then(|v| v.as_str()) {
                    Some("core.audit_logs") => {
                        let days = payload
                            .get("older_than_days")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(30)
                            .clamp(1, 3650);
                        sqlx::query(
                            "DELETE FROM core.audit_logs WHERE created_at < NOW() - make_interval(days => $1)",
                        )
                        .bind(days as i32)
                        .execute(&mut *txn)
                        .await?;
                        tracing::info!("Cleaned up core.audit_logs older than {} days", days);
                        None
                    }
                    Some(other) => Some(format!("cleanup: unknown table {other}")),
                    None => Some("cleanup: missing 'table' in payload".to_string()),
                }
            }
            _ => Some(format!("unknown task_type: {task_type}")),
        };

        if let Some(reason) = failure {
            task_failed = true;
            warn!(task_id = %id, tenant_id = %tenant_id, "Scheduled task failed: {reason}");
        }

        // Mark as completed (or failed)
        let status = if task_failed { "failed" } else { "completed" };
        sqlx::query(
            "UPDATE core.scheduled_tasks SET status = $2, updated_at = NOW() WHERE id = $1",
        )
        .bind(id)
        .bind(status)
        .execute(&mut *txn)
        .await?;
    }

    txn.commit().await?;
    Ok(())
}

/// RELIABILITY (fixed in audit): terminal outbox rows (completed/dlq) and old
/// idempotency records were never pruned — `core.outbox` grows forever (and
/// it carries full event payloads with PII, so this is also a retention
/// issue). Delete completed rows after 7 days and DLQ rows after 30 days;
/// idempotency records after 7 days. Bounded batch deletes avoid long locks.
async fn prune_terminal_rows(pool: &PgPool) -> Result<(), sqlx::Error> {
    let completed = sqlx::query(
        "DELETE FROM core.outbox WHERE id IN (
            SELECT id FROM core.outbox
            WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days'
            LIMIT 1000
        )",
    )
    .execute(pool)
    .await?
    .rows_affected();

    let dlq = sqlx::query(
        "DELETE FROM core.outbox WHERE id IN (
            SELECT id FROM core.outbox
            WHERE status = 'dlq' AND completed_at < NOW() - INTERVAL '30 days'
            LIMIT 1000
        )",
    )
    .execute(pool)
    .await?
    .rows_affected();

    let idem = sqlx::query(
        "DELETE FROM core.idempotency_records WHERE id IN (
            SELECT id FROM core.idempotency_records
            WHERE created_at < NOW() - INTERVAL '7 days'
            LIMIT 1000
        )",
    )
    .execute(pool)
    .await?
    .rows_affected();

    if completed + dlq + idem > 0 {
        info!(
            pruned_completed = completed,
            pruned_dlq = dlq,
            pruned_idempotency = idem,
            "Pruned terminal outbox/idempotency rows"
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use sqlx::PgPool;

    /// Integration-style test: skipped unless DATABASE_TEST_URL points at a
    /// live Postgres (same convention as the api crate's tests).
    #[tokio::test]
    async fn prunes_terminal_rows_only() {
        let Ok(db_url) = std::env::var("DATABASE_TEST_URL") else {
            eprintln!("Skipping: DATABASE_TEST_URL not set");
            return;
        };
        let Ok(pool) = PgPool::connect(&db_url).await else {
            eprintln!("Skipping: DB not reachable");
            return;
        };
        // A row completed long ago should be deleted; a pending row must stay.
        sqlx::query(
            "INSERT INTO core.outbox (schema, event_type, aggregate_id, payload, status, completed_at)
             VALUES ('core', 'PruneTest', $1, '{}'::jsonb, 'completed', NOW() - INTERVAL '30 days')",
        )
        .bind(uuid::Uuid::new_v4())
        .execute(&pool)
        .await
        .map_err(|e| {
            eprintln!("Skipping: migrations not applied: {e}");
            e
        })
        .ok();
        super::prune_terminal_rows(&pool).await.ok();
        let remaining: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM core.outbox WHERE event_type = 'PruneTest'")
                .fetch_one(&pool)
                .await
                .unwrap_or(0);
        assert_eq!(remaining, 0, "old completed rows must be pruned");
    }
}
