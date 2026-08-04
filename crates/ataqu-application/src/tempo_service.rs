//! TEMPO application service – orchestrates scheduling using domain repositories.
use chrono::{DateTime, Utc};
use std::sync::Arc;
use uuid::Uuid;

use ataqu_domain_tempo::repository::TempoRepository;
use ataqu_domain_tempo::schedule::{self as tempo_domain, BookingId, EventTypeId};
use ataqu_kernel::{Clock, IdGenerator, TenantId};

// Re-export domain types for API
pub use ataqu_domain_tempo::schedule::Booking;
pub use ataqu_domain_tempo::schedule::BookingStatus;

#[derive(Debug, Clone)]
pub struct CreateBookingCommand {
    pub tenant_id: TenantId,
    pub event_type_id: Uuid,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
}

#[derive(Debug, Clone)]
pub struct UpdateBookingStatusCommand {
    pub tenant_id: TenantId,
    pub booking_id: Uuid,
    pub status: BookingStatus,
}

#[derive(Debug, thiserror::Error)]
pub enum TempoServiceError {
    #[error("Booking not found")]
    BookingNotFound,
    #[error("Repository error: {0}")]
    Repository(String),
    #[error("Domain error: {0}")]
    Domain(String),
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type TempoResult<T> = Result<T, TempoServiceError>;

pub struct TempoService {
    repo: Arc<dyn TempoRepository + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl TempoService {
    pub fn new(
        repo: Arc<dyn TempoRepository + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            repo,
            id_gen,
            clock,
        }
    }

    pub async fn create_booking(&self, cmd: CreateBookingCommand) -> TempoResult<Booking> {
        if cmd.duration_minutes <= 0 {
            return Err(TempoServiceError::Validation(
                "Duration must be positive".to_string(),
            ));
        }
        let event_type_id = EventTypeId(cmd.event_type_id);
        let booking = tempo_domain::create_booking(
            cmd.tenant_id,
            event_type_id,
            cmd.starts_at.into(),
            cmd.duration_minutes,
            self.id_gen.as_ref(),
        );
        self.repo
            .create_booking(&booking)
            .await
            .map_err(TempoServiceError::Repository)?;
        Ok(booking)
    }

    pub async fn get_booking(&self, tenant_id: TenantId, id: Uuid) -> TempoResult<Booking> {
        let booking_id = BookingId(id);
        self.repo
            .find_booking_by_id(&tenant_id, &booking_id)
            .await
            .map_err(TempoServiceError::Repository)?
            .ok_or(TempoServiceError::BookingNotFound)
    }

    pub async fn list_bookings(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> TempoResult<Vec<Booking>> {
        self.repo
            .list_bookings(&tenant_id, limit, offset)
            .await
            .map_err(TempoServiceError::Repository)
    }

    pub async fn update_booking_status(
        &self,
        cmd: UpdateBookingStatusCommand,
    ) -> TempoResult<Booking> {
        let booking_id = BookingId(cmd.booking_id);
        self.repo
            .update_booking_status(&cmd.tenant_id, &booking_id, cmd.status)
            .await
            .map_err(TempoServiceError::Repository)?;
        self.get_booking(cmd.tenant_id, cmd.booking_id).await
    }

    pub async fn no_show_worker(&self, tenant_id: TenantId) -> TempoResult<Vec<Uuid>> {
        let now = self.clock.now();
        let upper_bound = now + std::time::Duration::from_secs(24 * 60 * 60);
        let bookings = self
            .repo
            .find_bookings_for_no_show_check(&tenant_id, upper_bound)
            .await
            .map_err(TempoServiceError::Repository)?;
        let mut updated = Vec::new();
        for booking in bookings {
            if tempo_domain::evaluate_no_show(&booking, now, 15) {
                // Fix: pass booking.id directly, not booking.id::NoShow
                self.repo
                    .update_booking_status(&tenant_id, &booking.id, BookingStatus::NoShow)
                    .await
                    .map_err(TempoServiceError::Repository)?;
                updated.push(booking.id.0);
            }
        }
        Ok(updated)
    }
}
