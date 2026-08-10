use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangelogEntry {
    pub id: i64,
    pub version: String,
    pub date: NaiveDate,
    pub title: String,
    pub description: String,
    pub category: String,
    pub breaking_change: bool,
    pub created_at: DateTime<Utc>,
}

pub fn filter_unread(entries: &[ChangelogEntry], last_read: DateTime<Utc>) -> Vec<ChangelogEntry> {
    entries
        .iter()
        .filter(|e| e.created_at > last_read)
        .cloned()
        .collect()
}
