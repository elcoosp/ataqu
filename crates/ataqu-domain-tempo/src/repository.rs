use async_trait::async_trait;
use ataqu_kernel::{RepositoryError, TenantId};
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::availability::AvailabilitySlot;
use crate::event_type::EventType;
use crate::schedule::{Booking, BookingId, BookingStatus, EventTypeId};

#[async_trait]
pub trait TempoRepository: Send + Sync {
    async fn create_booking(&self, booking: &Booking) -> Result<(), RepositoryError>;
    async fn find_booking_by_id(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
    ) -> Result<Option<Booking>, RepositoryError>;
    async fn list_bookings(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Booking>, RepositoryError>;
    async fn update_booking_status(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
        status: BookingStatus,
    ) -> Result<(), RepositoryError>;
    async fn reschedule_booking(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
        starts_at: DateTime<Utc>,
    ) -> Result<(), RepositoryError>;
    async fn mark_reminder_sent(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
        sent_at: std::time::SystemTime,
    ) -> Result<(), RepositoryError>;

    async fn find_bookings_for_no_show_check(
        &self,
        tenant_id: &TenantId,
        lower_bound: std::time::SystemTime,
        upper_bound: std::time::SystemTime,
    ) -> Result<Vec<Booking>, RepositoryError>;
    async fn find_upcoming_bookings_for_reminder(
        &self,
        tenant_id: &TenantId,
        start_bound: std::time::SystemTime,
        end_bound: std::time::SystemTime,
    ) -> Result<Vec<Booking>, RepositoryError>;

    async fn save_event_type(&self, event_type: &EventType) -> Result<(), RepositoryError>;
    async fn list_event_types(&self, tenant_id: &TenantId) -> Result<Vec<EventType>, RepositoryError>;
    async fn find_event_type_by_slug(
        &self,
        tenant_id: &TenantId,
        slug: &str,
    ) -> Result<Option<EventType>, RepositoryError>;
    async fn update_event_type(&self, event_type: &EventType) -> Result<(), RepositoryError>;
    async fn delete_event_type(&self, tenant_id: &TenantId, id: Uuid) -> Result<(), RepositoryError>;

    async fn check_overlap(
        &self,
        tenant_id: &TenantId,
        event_type_id: Uuid,
        starts_at: std::time::SystemTime,
        ends_at: std::time::SystemTime,
    ) -> Result<bool, RepositoryError>;

    async fn save_availability_slot(&self, slot: &AvailabilitySlot) -> Result<(), RepositoryError>;
    async fn list_availability_slots(
        &self,
        tenant_id: &TenantId,
        event_type_id: &EventTypeId,
    ) -> Result<Vec<AvailabilitySlot>, RepositoryError>;
    async fn delete_availability_slot(
        &self,
        tenant_id: &TenantId,
        slot_id: Uuid,
    ) -> Result<(), RepositoryError>;
}
