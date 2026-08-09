#![allow(clippy::new_without_default)]
use sea_orm::DatabaseConnection;
use tracing::warn;

#[derive(Clone)]
pub struct OnboardingService;

impl OnboardingService {
    pub fn new(_db: DatabaseConnection) -> Self {
        Self
    }

    pub async fn get_status(&self, _tenant_id: uuid::Uuid) -> serde_json::Value {
        warn!("OnboardingService is a placeholder");
        serde_json::json!({ "tasks_completed": [] })
    }
}
