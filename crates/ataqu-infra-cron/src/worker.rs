use sqlx::{PgPool, Row};
use std::time::Duration;
use tracing::{info, error};

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
        "#
    )
    .fetch_all(&mut *txn).await?;

    for row in rows {
        let id: uuid::Uuid = row.try_get("id")?;
        let task_type: String = row.try_get("task_type")?;
        let payload: serde_json::Value = row.try_get("payload")?;
        // Execute task based on task_type
        match task_type.as_str() {
            "send_email" => {
                // Placeholder: emit an outbox event for email
                // In a real implementation, we'd send via SMTP or trigger SPARK
                tracing::info!("Executing scheduled email task: {:?}", payload);
            }
            _ => {
                tracing::warn!("Unknown task_type: {}", task_type);
            }
        }
        // Mark as completed
        sqlx::query(
            "UPDATE core.scheduled_tasks SET status = 'completed' WHERE id = $1"
        )
        .bind(id)
        .execute(&mut *txn).await?;
    }

    txn.commit().await?;
    Ok(())
}
