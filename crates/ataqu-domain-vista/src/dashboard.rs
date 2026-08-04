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
}
