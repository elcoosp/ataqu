use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;

#[derive(Clone)]
pub struct RateLimiter {
    semaphore: Arc<Semaphore>,
}

impl RateLimiter {
    pub fn new(requests_per_second: usize) -> Self {
        // Allow burst slightly above limit
        let permits = requests_per_second * 2;
        Self {
            semaphore: Arc::new(Semaphore::new(permits)),
        }
    }

    pub async fn acquire(&self) -> Result<tokio::sync::OwnedSemaphorePermit, String> {
        let permit = self.semaphore.clone().acquire_owned().await
            .map_err(|e| format!("Failed to acquire rate limit permit: {}", e))?;
        // Spawn a task to release the permit after the window
        let sem = self.semaphore.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(500)).await;
            drop(sem);
        });
        Ok(permit)
    }
}
