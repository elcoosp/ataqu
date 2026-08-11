//! Stub for async CSV import worker. Implementation deferred.
use crate::outbox::Outbox;
use sea_orm::DatabaseConnection;
use std::sync::Arc;

pub struct ImportWorker {
    _db: DatabaseConnection,
    _outbox: Arc<dyn Outbox>,
}

impl ImportWorker {
    pub fn new(db: DatabaseConnection, outbox: Arc<dyn Outbox>) -> Self {
        Self { _db: db, _outbox: outbox }
    }
    pub async fn run(&self) -> Result<(), String> {
        // TODO: Implement import worker
        Ok(())
    }
}
