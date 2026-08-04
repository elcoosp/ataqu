use std::time::Duration;
use tracing::info;

pub async fn run_cron_worker() {
    info!("Starting cron worker...");
    loop {
        tokio::time::sleep(Duration::from_secs(60)).await;
        // TODO: Add scheduled job polling logic here
    }
}
