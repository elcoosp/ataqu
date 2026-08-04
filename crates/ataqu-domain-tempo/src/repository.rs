use crate::availability::AvailabilitySlot;
use crate::event_type::EventType;
use crate::schedule::{Booking, BookingId};
use async_trait::async_trait;
use ataqu_kernel::TenantId;
use uuid::Uuid;

#[async_trait]
pub trait TempoRepository: Send + Sync {
    async fn create_booking(&self, booking: &Booking) -> Result<(), String>;
    async fn find_booking_by_id(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
    ) -> Result<Option<Booking>, String>;
    async fn list_bookings(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Booking>, String>;
    async fn update_booking_status(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
        status: crate::schedule::BookingStatus,
    ) -> Result<(), String>;
    async fn find_bookings_for_no_show_check(
        &self,
        tenant_id: &TenantId,
        upper_bound: std::time::SystemTime,
    ) -> Result<Vec<Booking>, String>;

    async fn find_upcoming_bookings_for_reminder(
        &self,
        tenant_id: &TenantId,
        start_bound: std::time::SystemTime,
        end_bound: std::time::SystemTime,
    ) -> Result<Vec<Booking>, String>;

    async fn mark_reminder_sent(&self, tenant_id: &TenantId, booking_id: &BookingId, sent_at: std::time::SystemTime) -> Result<(), String>;

    async fn save_event_type(&self, event_type: &EventType) -> Result<(), String>;
    async fn list_event_types(&self, tenant_id: &TenantId) -> Result<Vec<EventType>, String>;

    async fn save_availability_slot(&self, slot: &AvailabilitySlot) -> Result<(), String>;
    async fn list_availability_slots(&self, tenant_id: &TenantId, event_type_id: &Uuid) -> Result<Vec<AvailabilitySlot>, String>;
    async fn delete_availability_slot(&self, tenant_id: &TenantId, slot_id: &Uuid) -> Result<(), String>;
}
