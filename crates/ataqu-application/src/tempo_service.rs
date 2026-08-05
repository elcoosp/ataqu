//! TEMPO application service – orchestrates scheduling using domain repositories.
use chrono::{DateTime, Utc};
use std::sync::Arc;
use uuid::Uuid;

use ataqu_domain_tempo::availability::{self as availability_domain, AvailabilitySlot};
use ataqu_domain_tempo::repository::TempoRepository;
use ataqu_domain_tempo::schedule::{self as tempo_domain, BookingId, EventTypeId};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use crate::outbox::Outbox;

// Re-export domain types for API
pub use ataqu_domain_tempo::schedule::Booking;
pub use ataqu_domain_tempo::schedule::BookingStatus;
pub use ataqu_domain_tempo::event_type::EventType;

#[derive(Debug, Clone)]
pub struct CreateBookingCommand {
    pub tenant_id: TenantId,
    pub event_type_id: Uuid,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
    pub timezone: String,
}

#[derive(Debug, Clone)]
pub struct UpdateBookingStatusCommand {
    pub tenant_id: TenantId,
    pub booking_id: Uuid,
    pub status: BookingStatus,
}

#[derive(Debug, Clone)]
pub struct CreateEventTypeCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub duration_minutes: i32,
}

#[derive(Debug, Clone)]
pub struct CreateAvailabilitySlotCommand {
    pub tenant_id: TenantId,
    pub event_type_id: Uuid,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
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
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl TempoService {
    pub fn new(
        repo: Arc<dyn TempoRepository + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            repo,
            outbox,
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

        let starts_at: std::time::SystemTime = cmd.starts_at.into();
        let ends_at: std::time::SystemTime = starts_at + std::time::Duration::from_secs((cmd.duration_minutes * 60) as u64);
        let existing_bookings = self.repo.list_bookings(&cmd.tenant_id, 1000, 0).await.map_err(TempoServiceError::Repository)?;
        for b in existing_bookings {
            if b.status != BookingStatus::Cancelled && b.status != BookingStatus::Completed {
                let b_ends_at = b.ends_at();
                if starts_at < b_ends_at && ends_at > b.starts_at {
                    return Err(TempoServiceError::Validation("Booking overlaps with existing booking".to_string()));
                }
            }
        }

        let event_type_id = EventTypeId(cmd.event_type_id);
        let booking = tempo_domain::create_booking(
            cmd.tenant_id,
            event_type_id,
            cmd.starts_at.into(),
            cmd.duration_minutes,
            cmd.timezone,
            self.id_gen.as_ref(),
        );
        self.repo
            .create_booking(&booking)
            .await
            .map_err(TempoServiceError::Repository)?;

        let payload = serde_json::json!({
            "booking_id": booking.id.0,
            "tenant_id": booking.tenant_id.as_uuid(),
            "event_type_id": booking.event_type_id.0,
            "starts_at": booking.starts_at,
            "timezone": booking.timezone,
        });
        self.outbox.append("tempo", "BookingCreated", booking.id.0, &payload).await.map_err(|e| TempoServiceError::Repository(e))?;

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
                self.repo
                    .update_booking_status(&tenant_id, &booking.id, BookingStatus::NoShow)
                    .await
                    .map_err(TempoServiceError::Repository)?;
                updated.push(booking.id.0);
            }
        }
        Ok(updated)
    }

    pub async fn reminder_worker(&self, tenant_id: TenantId) -> TempoResult<Vec<Uuid>> {
        let now = self.clock.now();
        let start_bound = now;
        let end_bound = now + std::time::Duration::from_secs(15 * 60); // Next 15 minutes

        let bookings = self.repo.find_upcoming_bookings_for_reminder(&tenant_id, start_bound, end_bound).await
            .map_err(TempoServiceError::Repository)?;

        let mut sent = Vec::new();
        for booking in bookings {
            let payload = serde_json::json!({
                "booking_id": booking.id.0,
                "tenant_id": booking.tenant_id.as_uuid(),
                "starts_at": booking.starts_at,
                "timezone": booking.timezone,
            });
            self.outbox.append("tempo", "SendBookingReminder", booking.id.0, &payload).await
                .map_err(|e| TempoServiceError::Repository(e))?;

            self.repo.mark_reminder_sent(&tenant_id, &booking.id, now).await
                .map_err(TempoServiceError::Repository)?;
            sent.push(booking.id.0);
        }
        Ok(sent)
    }

    pub async fn create_event_type(&self, cmd: CreateEventTypeCommand) -> TempoResult<EventType> {
        let domain_cmd = ataqu_domain_tempo::CreateEventTypeCommand {
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            slug: cmd.slug,
            description: cmd.description,
            duration_minutes: cmd.duration_minutes,
        };
        let event_type = ataqu_domain_tempo::event_type::create_event_type(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(TempoServiceError::Validation)?;
        self.repo.save_event_type(&event_type).await.map_err(TempoServiceError::Repository)?;
        Ok(event_type)
    }

    pub async fn list_event_types(&self, tenant_id: TenantId) -> TempoResult<Vec<EventType>> {
        self.repo.list_event_types(&tenant_id).await.map_err(TempoServiceError::Repository)
    }

    pub async fn get_event_type_by_slug(&self, tenant_id: TenantId, slug: String) -> TempoResult<EventType> {
        self.repo.find_event_type_by_slug(&tenant_id, &slug).await
            .map_err(TempoServiceError::Repository)?
            .ok_or(TempoServiceError::Validation("Event type not found".to_string()))
    }

    pub async fn create_availability_slot(&self, cmd: CreateAvailabilitySlotCommand) -> TempoResult<AvailabilitySlot> {
        let domain_cmd = availability_domain::CreateAvailabilitySlotCommand {
            tenant_id: cmd.tenant_id,
            event_type_id: cmd.event_type_id,
            start_time: cmd.start_time,
            end_time: cmd.end_time,
        };
        let slot = availability_domain::create_slot(domain_cmd, self.id_gen.as_ref());
        self.repo.save_availability_slot(&slot).await.map_err(TempoServiceError::Repository)?;
        Ok(slot)
    }

    pub async fn list_availability_slots(&self, tenant_id: TenantId, event_type_id: Uuid) -> TempoResult<Vec<AvailabilitySlot>> {
        self.repo.list_availability_slots(&tenant_id, &event_type_id).await.map_err(TempoServiceError::Repository)
    }

    pub async fn delete_availability_slot(&self, tenant_id: TenantId, slot_id: Uuid) -> TempoResult<()> {
        self.repo.delete_availability_slot(&tenant_id, &slot_id).await.map_err(TempoServiceError::Repository)
    }

    pub async fn public_create_booking(&self, tenant_id: TenantId, slug: String, starts_at: DateTime<Utc>, timezone: String) -> TempoResult<Booking> {
        let event_type = self.get_event_type_by_slug(tenant_id, slug).await?;
        if !event_type.is_active {
            return Err(TempoServiceError::Validation("Event type is not active".to_string()));
        }
        let cmd = CreateBookingCommand {
            tenant_id,
            event_type_id: event_type.id.0,
            starts_at,
            duration_minutes: event_type.duration_minutes,
            timezone,
        };
        self.create_booking(cmd).await
    }
}
