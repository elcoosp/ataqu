use ataqu_kernel::TenantId;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct AvailabilitySlot {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub event_type_id: Uuid,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub is_booked: bool,
}

#[derive(Debug, Clone)]
pub struct CreateAvailabilitySlotCommand {
    pub tenant_id: TenantId,
    pub event_type_id: Uuid,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
}

pub fn create_slot(
    cmd: CreateAvailabilitySlotCommand,
    id_gen: &dyn ataqu_kernel::IdGenerator,
) -> AvailabilitySlot {
    AvailabilitySlot {
        id: id_gen.new_uuid_v7(),
        tenant_id: cmd.tenant_id,
        event_type_id: cmd.event_type_id,
        start_time: cmd.start_time,
        end_time: cmd.end_time,
        is_booked: false,
    }
}
