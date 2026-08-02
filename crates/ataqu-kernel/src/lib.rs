use std::time::SystemTime;
use uuid::Uuid;

#[allow(dead_code)]
pub struct TenantId(Uuid);
impl TenantId {
    pub fn new(id: Uuid) -> Self {
        Self(id)
    }
}

pub trait IdGenerator: Send + Sync {
    fn new_uuid_v7(&self) -> Uuid;
}

pub trait Clock: Send + Sync {
    fn now(&self) -> SystemTime;
}
