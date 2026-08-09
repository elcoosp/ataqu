#![allow(clippy::new_without_default)]
use sea_orm::DatabaseConnection;
use tracing::warn;

#[derive(Clone)]
pub struct ChangelogService;

impl ChangelogService {
    pub fn new(_db: DatabaseConnection) -> Self {
        Self
    }

    pub async fn list_entries(&self) -> Vec<serde_json::Value> {
        warn!("ChangelogService is a placeholder");
        vec![]
    }
}
