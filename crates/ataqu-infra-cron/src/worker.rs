use sqlx::{PgPool, Row};

use std::time::Duration;
use tracing::{error, info, warn};

pub async fn run_cron_worker(pool: PgPool) {
    info!("Cron worker started");
    loop {
        if let Err(e) = poll_tasks(&pool).await {
            error!("Cron poll failed: {}", e);
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

        match task_type.as_str() {
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
            }
            "reminder" => {
                // Send a reminder via DIAL
                if let (Some(channel_id_str), Some(message), Some(user_id_str)) = (
                    payload.get("channel_id").and_then(|v| v.as_str()),
                    payload.get("message").and_then(|v| v.as_str()),
                    payload.get("user_id").and_then(|v| v.as_str()),
                ) && let (Ok(channel_id), Ok(user_id)) = (
                    uuid::Uuid::parse_str(channel_id_str),
                    uuid::Uuid::parse_str(user_id_str),
                ) {
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
                }
            }
            "cleanup" => {
                // Perform cleanup tasks: delete old audit logs, etc.
                if let Some(table) = payload.get("table").and_then(|v| v.as_str()) {
                    let days = payload
                        .get("older_than_days")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(30);
                    if table == "core.audit_logs" {
                        let delete_sql = format!(
                            "DELETE FROM {} WHERE created_at < NOW() - INTERVAL '{} days'",
                            table, days
                        );
                        let sql_static: &'static str = Box::leak(delete_sql.into_boxed_str());
                        sqlx::query(sql_static).execute(&mut *txn).await?;
                        tracing::info!("Cleaned up {} older than {} days", table, days);
                    }
                }
            }
            _ => {
                warn!("Unknown task_type: {}", task_type);
            }
        }
        // Mark as completed
        sqlx::query("UPDATE core.scheduled_tasks SET status = 'completed' WHERE id = $1")
            .bind(id)
            .execute(&mut *txn)
            .await?;
    }

    txn.commit().await?;
    Ok(())
}
