use std::time::SystemTime;
pub use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct TenantId(Uuid);

impl TenantId {
    pub fn new(uuid: Uuid) -> Self {
        Self(uuid)
    }
    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

pub trait IdGenerator: Send + Sync {
    fn new_uuid_v7(&self) -> Uuid;
}

pub trait Clock: Send + Sync {
    fn now(&self) -> SystemTime;
}

pub struct SystemIdGenerator;
impl IdGenerator for SystemIdGenerator {
    fn new_uuid_v7(&self) -> Uuid {
        Uuid::now_v7()
    }
}

pub struct SystemClock;
impl Clock for SystemClock {
    fn now(&self) -> SystemTime {
        SystemTime::now()
    }
}

pub trait Identifiable {
    fn id(&self) -> Uuid;
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Not found")]
    NotFound,
    #[error("Database error: {0}")]
    Database(String),
}
