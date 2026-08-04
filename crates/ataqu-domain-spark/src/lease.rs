use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct Lease {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_id: Uuid,
    pub fence_token: u64,
    pub holder: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Lease {
    pub fn new(tenant_id: Uuid, workflow_id: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            tenant_id,
            workflow_id,
            fence_token: 0,
            holder: None,
            expires_at: None,
            created_at: now,
            updated_at: now,
        }
    }
}
