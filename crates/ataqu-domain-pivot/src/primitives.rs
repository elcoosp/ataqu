use std::time::SystemTime;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Uuid([u8; 16]);

impl Uuid {
    pub fn nil() -> Self {
        Self([0u8; 16])
    }
}

pub trait IdGenerator: Send + Sync {
    fn new_uuid_v7(&self) -> Uuid;
}

pub trait Clock: Send + Sync {
    fn now(&self) -> SystemTime;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TenantId(Uuid);

impl TenantId {
    pub fn new(id: Uuid) -> Self {
        Self(id)
    }

    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}
