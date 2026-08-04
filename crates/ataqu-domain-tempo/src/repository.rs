use async_trait::async_trait;
use ataqu_kernel::TenantId;
use crate::schedule::{Booking, BookingId};

#[async_trait]
pub trait TempoRepository: Send + Sync {
    async fn create_booking(&self, booking: &Booking) -> Result<(), String>;
    async fn find_booking_by_id(&self, tenant_id: &TenantId, id: &BookingId) -> Result<Option<Booking>, String>;
    async fn list_bookings(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> Result<Vec<Booking>, String>;
    async fn update_booking_status(&self, tenant_id: &TenantId, id: &BookingId, status: crate::schedule::BookingStatus) -> Result<(), String>;
    async fn find_bookings_for_no_show_check(&self, tenant_id: &TenantId, upper_bound: std::time::SystemTime) -> Result<Vec<Booking>, String>;
}
