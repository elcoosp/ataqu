use ataqu_kernel::{Clock, IdGenerator, TenantId};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Reservation {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub variant_id: Uuid,
    pub quantity: i64,
    pub status: String,
    pub expires_at: Option<SystemTime>,
    pub created_at: SystemTime,
}

pub struct CreateReservationCommand {
    pub tenant_id: TenantId,
    pub variant_id: Uuid,
    pub quantity: i64,
    pub expires_at: Option<SystemTime>,
}

pub fn create_reservation(cmd: CreateReservationCommand, id_gen: &dyn IdGenerator, clock: &dyn Clock) -> Reservation {
    Reservation {
        id: id_gen.new_uuid_v7(),
        tenant_id: cmd.tenant_id,
        variant_id: cmd.variant_id,
        quantity: cmd.quantity,
        status: "active".to_string(),
        expires_at: cmd.expires_at,
        created_at: clock.now(),
    }
}

#[derive(Debug, Clone)]
pub struct StockMovement {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub variant_id: Uuid,
    pub quantity: i64,
    pub reason: String,
    pub reference: Option<String>,
    pub timestamp: SystemTime,
}

pub struct CreateMovementCommand {
    pub tenant_id: TenantId,
    pub variant_id: Uuid,
    pub quantity: i64,
    pub reason: String,
    pub reference: Option<String>,
}

pub fn create_movement(cmd: CreateMovementCommand, id_gen: &dyn IdGenerator, clock: &dyn Clock) -> StockMovement {
    StockMovement {
        id: id_gen.new_uuid_v7(),
        tenant_id: cmd.tenant_id,
        variant_id: cmd.variant_id,
        quantity: cmd.quantity,
        reason: cmd.reason,
        reference: cmd.reference,
        timestamp: clock.now(),
    }
}
