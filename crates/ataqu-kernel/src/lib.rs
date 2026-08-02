use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
pub struct TenantId(Uuid);

impl std::fmt::Display for TenantId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}
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

pub trait Identifiable {
    fn id(&self) -> uuid::Uuid;
}
