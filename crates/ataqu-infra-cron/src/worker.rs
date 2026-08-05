use tracing::info;
use std::time::Duration;

pub async fn run_cron_worker() {
    info!("Starting cron worker...");
    loop {
        tokio::time::sleep(Duration::from_secs(60)).await;
        // In a real implementation, we would poll `core.scheduled_tasks`
        // using `FOR UPDATE SKIP LOCKED` and trigger SPARK workflows.
        tracing::debug!("Cron worker tick.");
    }
}
