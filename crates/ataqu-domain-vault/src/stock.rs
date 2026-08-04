//! Stock movements and tracking.

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use std::time::SystemTime;
use uuid::Uuid;

// Re-export errors from inventory for convenience
pub use crate::inventory::StockError;

/// A record of a stock movement (inbound or outbound).
#[derive(Debug, Clone, PartialEq)]
pub struct StockMovement {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub variant_id: Uuid,
    pub quantity: i64, // positive = inbound, negative = outbound
    pub reason: String,
    pub reference: Option<String>, // e.g., deal_id, PO number
    pub timestamp: SystemTime,
}

#[derive(Debug, Clone)]
pub struct CreateMovementCommand {
    pub tenant_id: TenantId,
    pub variant_id: Uuid,
    pub quantity: i64,
    pub reason: String,
    pub reference: Option<String>,
}

pub fn create_movement(
    cmd: CreateMovementCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> StockMovement {
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

/// A reservation record (for auditing purposes).
#[derive(Debug, Clone, PartialEq)]
pub struct Reservation {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub variant_id: Uuid,
    pub quantity: i64,
    pub status: ReservationStatus,
    pub expires_at: Option<SystemTime>,
    pub created_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ReservationStatus {
    Pending,
    Confirmed,
    Cancelled,
}

#[derive(Debug, Clone)]
pub struct CreateReservationCommand {
    pub tenant_id: TenantId,
    pub variant_id: Uuid,
    pub quantity: i64,
    pub expires_at: Option<SystemTime>,
}

pub fn create_reservation(
    cmd: CreateReservationCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Reservation {
    Reservation {
        id: id_gen.new_uuid_v7(),
        tenant_id: cmd.tenant_id,
        variant_id: cmd.variant_id,
        quantity: cmd.quantity,
        status: ReservationStatus::Pending,
        expires_at: cmd.expires_at,
        created_at: clock.now(),
    }
}

impl Reservation {
    pub fn confirm(&mut self) {
        self.status = ReservationStatus::Confirmed;
    }

    pub fn cancel(&mut self) {
        self.status = ReservationStatus::Cancelled;
    }
}
