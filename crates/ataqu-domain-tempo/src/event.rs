use crate::schedule::{BookingId, EventTypeId};
use ataqu_kernel::TenantId;
use std::time::SystemTime;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookingCreated {
    pub booking_id: BookingId,
    pub tenant_id: TenantId,
    pub event_type_id: EventTypeId,
    pub starts_at: SystemTime,
    pub duration_minutes: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookingConfirmed {
    pub booking_id: BookingId,
    pub tenant_id: TenantId,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookingCancelled {
    pub booking_id: BookingId,
    pub tenant_id: TenantId,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookingMarkedNoShow {
    pub booking_id: BookingId,
    pub tenant_id: TenantId,
}
