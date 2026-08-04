use crate::primitives::{Clock, IdGenerator, TenantId, Uuid};
use std::time::SystemTime;

#[derive(Debug, Clone)]
pub struct CreateDatabaseCommand {
    pub tenant_id: TenantId,
    pub name: String,
}

#[derive(Debug, Clone)]
pub struct DatabaseCreatedEvent {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub created_at: SystemTime,
}

pub fn create_database(
    cmd: CreateDatabaseCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> DatabaseCreatedEvent {
    DatabaseCreatedEvent {
        id: id_gen.new_uuid_v7(),
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        created_at: clock.now(),
    }
}
