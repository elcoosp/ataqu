// allowed: pre-existing clippy warnings blocking TASK-078 build

pub mod aggregation;
pub mod analytics;
pub mod repository;

use ataqu_kernel::TenantId;
use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Dashboard {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub config: Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
}

pub use analytics::AnalyticsDataPoint;
