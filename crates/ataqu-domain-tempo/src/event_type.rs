use crate::schedule::EventTypeId;
use ataqu_kernel::TenantId;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq)]
pub struct EventType {
    pub id: EventTypeId,
    pub tenant_id: TenantId,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub duration_minutes: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateEventTypeCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub duration_minutes: i32,
}

pub fn create_event_type(
    cmd: CreateEventTypeCommand,
    id_gen: &dyn ataqu_kernel::IdGenerator,
    clock: &dyn ataqu_kernel::Clock,
) -> Result<EventType, String> {
    if cmd.name.trim().is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    if cmd.duration_minutes <= 0 {
        return Err("Duration must be positive".to_string());
    }

    let id = EventTypeId(id_gen.new_uuid_v7());
    let now = DateTime::<Utc>::from(clock.now());

    Ok(EventType {
        id,
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        slug: cmd.slug,
        description: cmd.description,
        duration_minutes: cmd.duration_minutes,
        is_active: true,
        created_at: now,
        updated_at: now,
    })
}
