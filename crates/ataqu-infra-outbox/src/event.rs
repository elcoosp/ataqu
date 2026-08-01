use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;

/// Represents a row from the core.outbox table.
#[derive(Debug, Clone, Deserialize)]
pub struct OutboxEvent {
    pub id: i64,
    pub schema: String,
    pub event_type: String,
    pub aggregate_id: Option<Uuid>,
    pub payload: Value,
    pub status: String,
    pub priority: String,
    pub attempts: i32,
    pub locked_until: Option<DateTime<Utc>>,
    pub vista_consumed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}
