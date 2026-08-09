//! TEMPO application service – orchestrates scheduling using domain repositories.
use chrono::{DateTime, Utc};
use std::sync::Arc;
use uuid::Uuid;

use crate::outbox::Outbox;
use ataqu_domain_tempo::availability::{self as availability_domain, AvailabilitySlot};
use ataqu_domain_tempo::repository::TempoRepository;
use ataqu_domain_tempo::schedule::{self as tempo_domain, BookingId, EventTypeId};
use ataqu_kernel::{Clock, IdGenerator, TenantId};

// Re-export domain types for API
pub use ataqu_domain_tempo::event_type::EventType;
pub use ataqu_domain_tempo::schedule::Booking;
pub use ataqu_domain_tempo::schedule::BookingStatus;

#[derive(Debug, Clone)]
pub struct CreateBookingCommand {
    pub tenant_id: TenantId,
    pub event_type_id: Uuid,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
    pub timezone: String,
    pub contact_id: Option<Uuid>,
}

#[derive(Debug, Clone)]
pub struct UpdateBookingStatusCommand {
    pub tenant_id: TenantId,
    pub booking_id: Uuid,
    pub status: BookingStatus,
    pub expected_version: i32,
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
pub struct UpdateEventTypeCommand {
    pub tenant_id: TenantId,
    pub id: Uuid,
    pub name: Option<String>,
    pub slug: Option<String>,
    pub description: Option<Option<String>>,
    pub duration_minutes: Option<i32>,
    pub is_active: Option<bool>,
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
    #[error("Event type not found")]
    EventTypeNotFound,
    #[error("Repository error: {0}")]
    Repository(ataqu_kernel::RepositoryError),
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
    audit_repo: Option<Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>>,
}

impl TempoService {
    pub fn new(
        repo: Arc<dyn TempoRepository + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
        audit_repo: Option<Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>>,
    ) -> Self {
        Self {
            repo,
            outbox,
            id_gen,
            clock,
            audit_repo,
        }
    }

    pub async fn create_booking(&self, cmd: CreateBookingCommand) -> TempoResult<Booking> {
        if cmd.duration_minutes <= 0 {
            return Err(TempoServiceError::Validation(
                "Duration must be positive".to_string(),
            ));
        }

        if cmd.timezone.parse::<chrono_tz::Tz>().is_err() {
            return Err(TempoServiceError::Validation(
                "Invalid timezone".to_string(),
            ));
        }

        let event_types = self
            .repo
            .list_event_types(&cmd.tenant_id)
            .await
            .map_err(TempoServiceError::Repository)?;
        let _event_type = event_types
            .iter()
            .find(|et| et.id.0 == cmd.event_type_id)
            .cloned()
            .ok_or(TempoServiceError::Validation(
                "Event type not found".to_string(),
            ))?;

        let starts_at: std::time::SystemTime = cmd.starts_at.into();
        let ends_at =
            starts_at + std::time::Duration::from_secs((cmd.duration_minutes * 60) as u64);

        if self
            .repo
            .check_overlap(&cmd.tenant_id, cmd.event_type_id, starts_at, ends_at)
            .await
            .map_err(TempoServiceError::Repository)?
        {
            return Err(TempoServiceError::Validation(
                "Booking overlaps with existing booking".to_string(),
            ));
        }

        // ADR-032: Check availability slots
        let slots = self
            .repo
            .list_availability_slots(&cmd.tenant_id, &EventTypeId(cmd.event_type_id))
            .await
            .map_err(TempoServiceError::Repository)?;
        let is_available = slots.iter().any(|slot| {
            let slot_start: std::time::SystemTime = slot.start_time.into();
            let slot_end: std::time::SystemTime = slot.end_time.into();
            slot_start <= starts_at && slot_end >= ends_at
        });
        if !is_available {
            return Err(TempoServiceError::Validation(
                "Booking time is outside of available slots".to_string(),
            ));
        }

        let event_type_id = EventTypeId(cmd.event_type_id);
        let booking = tempo_domain::create_booking(
            cmd.tenant_id,
            event_type_id,
            cmd.starts_at.into(),
            cmd.duration_minutes,
            cmd.timezone,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
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
            "contact_id": cmd.contact_id,
        });
        self.outbox
            .append("collab_ops", "BookingCreated", booking.id.0, &payload)
            .await
            .map_err(|e| {
                TempoServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
            })?;

        // CRM Integration: Emit event for CINQ to consume
        if let Some(contact_id) = cmd.contact_id {
            let starts_at_dt: chrono::DateTime<chrono::Utc> = booking.starts_at.into();
            let crm_payload = serde_json::json!({
                "tenant_id": booking.tenant_id.as_uuid(),
                "contact_id": contact_id,
                "activity_type": "meeting",
                "description": format!("Scheduled meeting for {}", starts_at_dt.to_rfc3339()),
                "scheduled_at": booking.starts_at,
            });
            self.outbox
                .append(
                    "collab_crm",
                    "TempoBookingCreatedForContact",
                    contact_id,
                    &crm_payload,
                )
                .await
                .map_err(|e| {
                    TempoServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
                })?;
        }

        if let Some(audit_repo) = &self.audit_repo {
            audit_repo.append_log(
                booking.tenant_id,
                Uuid::nil(),
                "create_booking",
                "tempo",
                Some("booking"),
                Some(booking.id.0),
                None,
                Some(serde_json::json!({"event_type_id": booking.event_type_id.0, "starts_at": booking.starts_at})),
                None,
                None,
            ).await.ok();
        }

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
    ) -> TempoResult<(Vec<Booking>, u64)> {
        let total = self
            .repo
            .count_bookings(&tenant_id)
            .await
            .map_err(TempoServiceError::Repository)?;
        let bookings = self
            .repo
            .list_bookings(&tenant_id, limit, offset)
            .await
            .map_err(TempoServiceError::Repository)?;
        Ok((bookings, total))
    }

    pub async fn update_booking_status(
        &self,
        cmd: UpdateBookingStatusCommand,
    ) -> TempoResult<Booking> {
        let booking_id = BookingId(cmd.booking_id);
        let booking = self
            .repo
            .find_booking_by_id(&cmd.tenant_id, &booking_id)
            .await
            .map_err(TempoServiceError::Repository)?
            .ok_or(TempoServiceError::BookingNotFound)?;

        if booking.version != cmd.expected_version {
            return Err(TempoServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, booking.version
            )));
        }

        match (&booking.status, &cmd.status) {
            (BookingStatus::Cancelled, _) => {
                return Err(TempoServiceError::Validation(
                    "Cannot update a cancelled booking".to_string(),
                ));
            }
            (_, BookingStatus::Cancelled) => {
                // Allow cancellation from any active state
            }
            (BookingStatus::Completed, _) => {
                return Err(TempoServiceError::Validation(
                    "Cannot update a completed booking".to_string(),
                ));
            }
            (BookingStatus::NoShow, _) => {
                return Err(TempoServiceError::Validation(
                    "Cannot update a no-show booking".to_string(),
                ));
            }
            (current, new) if current == new => {
                return Err(TempoServiceError::Validation(
                    "Booking is already in this status".to_string(),
                ));
            }
            _ => {}
        }

        self.repo
            .update_booking_status(&cmd.tenant_id, &booking_id, cmd.status.clone())
            .await
            .map_err(TempoServiceError::Repository)?;
        let mut updated_booking = self.get_booking(cmd.tenant_id, cmd.booking_id).await?;
        updated_booking.version += 1;
        self.repo
            .update_booking_version(&cmd.tenant_id, &booking_id, updated_booking.version)
            .await
            .map_err(TempoServiceError::Repository)?;
        Ok(updated_booking)
    }

    pub async fn no_show_worker(&self, tenant_id: TenantId) -> TempoResult<Vec<Uuid>> {
        let now = self.clock.now();
        let upper_bound = now + std::time::Duration::from_secs(24 * 60 * 60);
        let lower_bound = now - std::time::Duration::from_secs(24 * 60 * 60);
        let bookings = self
            .repo
            .find_bookings_for_no_show_check(&tenant_id, lower_bound, upper_bound)
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

                let payload = serde_json::json!({
                    "booking_id": booking.id.0,
                    "tenant_id": booking.tenant_id.as_uuid(),
                    "event_type": "NoShowDetected"
                });
                self.outbox
                    .append("collab_ops", "NoShowDetected", booking.id.0, &payload)
                    .await
                    .map_err(|e| {
                        TempoServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
                    })?;
            }
        }
        Ok(updated)
    }

    pub async fn reminder_worker(&self, tenant_id: TenantId) -> TempoResult<Vec<Uuid>> {
        let now = self.clock.now();
        let start_bound = now;
        let end_bound = now + std::time::Duration::from_secs(15 * 60); // Next 15 minutes

        let bookings = self
            .repo
            .find_upcoming_bookings_for_reminder(&tenant_id, start_bound, end_bound)
            .await
            .map_err(TempoServiceError::Repository)?;

        let mut sent = Vec::new();
        for booking in bookings {
            let payload = serde_json::json!({
                "booking_id": booking.id.0,
                "tenant_id": booking.tenant_id.as_uuid(),
                "starts_at": booking.starts_at,
                "timezone": booking.timezone,
                "email": "noreply@ataqu.com",
            });
            self.outbox
                .append("collab_ops", "SendBookingReminder", booking.id.0, &payload)
                .await
                .map_err(|e| {
                    TempoServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
                })?;

            self.repo
                .mark_reminder_sent(&tenant_id, &booking.id, now)
                .await
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
        let event_type = ataqu_domain_tempo::event_type::create_event_type(
            domain_cmd,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        )
        .map_err(TempoServiceError::Validation)?;
        self.repo
            .save_event_type(&event_type)
            .await
            .map_err(TempoServiceError::Repository)?;
        Ok(event_type)
    }

    pub async fn list_event_types(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> TempoResult<(Vec<EventType>, u64)> {
        let total = self
            .repo
            .count_event_types(&tenant_id)
            .await
            .map_err(TempoServiceError::Repository)?;
        let event_types = self
            .repo
            .list_event_types(&tenant_id)
            .await
            .map_err(TempoServiceError::Repository)?;
        let items = event_types
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        Ok((items, total))
    }

    pub async fn get_event_type_by_slug(
        &self,
        tenant_id: TenantId,
        slug: String,
    ) -> TempoResult<EventType> {
        self.repo
            .find_event_type_by_slug(&tenant_id, &slug)
            .await
            .map_err(TempoServiceError::Repository)?
            .ok_or(TempoServiceError::Validation(
                "Event type not found".to_string(),
            ))
    }

    pub async fn update_event_type(
        &self,
        cmd: UpdateEventTypeCommand,
        expected_version: i32,
    ) -> TempoResult<EventType> {
        let mut event_type = self
            .repo
            .find_event_type_by_id(&cmd.tenant_id, cmd.id)
            .await
            .map_err(TempoServiceError::Repository)?
            .ok_or(TempoServiceError::EventTypeNotFound)?;

        if event_type.version != expected_version {
            return Err(TempoServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, event_type.version
            )));
        }

        if let Some(name) = cmd.name {
            event_type.name = name;
        }
        if let Some(slug) = cmd.slug {
            event_type.slug = slug;
        }
        if let Some(desc) = cmd.description {
            event_type.description = desc;
        }
        if let Some(duration) = cmd.duration_minutes {
            event_type.duration_minutes = duration;
        }
        if let Some(is_active) = cmd.is_active {
            event_type.is_active = is_active;
        }
        event_type.version += 1;

        self.repo
            .update_event_type(&event_type)
            .await
            .map_err(TempoServiceError::Repository)?;
        Ok(event_type)
    }

    pub async fn delete_event_type(&self, tenant_id: TenantId, id: Uuid) -> TempoResult<()> {
        self.repo
            .delete_event_type(&tenant_id, id)
            .await
            .map_err(TempoServiceError::Repository)
    }

    pub async fn create_availability_slot(
        &self,
        cmd: CreateAvailabilitySlotCommand,
    ) -> TempoResult<AvailabilitySlot> {
        let domain_cmd = availability_domain::CreateAvailabilitySlotCommand {
            tenant_id: cmd.tenant_id,
            event_type_id: cmd.event_type_id,
            start_time: cmd.start_time,
            end_time: cmd.end_time,
        };
        let slot = availability_domain::create_slot(domain_cmd, self.id_gen.as_ref());
        self.repo
            .save_availability_slot(&slot)
            .await
            .map_err(TempoServiceError::Repository)?;
        Ok(slot)
    }

    pub async fn list_availability_slots(
        &self,
        tenant_id: TenantId,
        event_type_id: Uuid,
    ) -> TempoResult<Vec<AvailabilitySlot>> {
        self.repo
            .list_availability_slots(&tenant_id, &EventTypeId(event_type_id))
            .await
            .map_err(TempoServiceError::Repository)
    }

    pub async fn delete_availability_slot(
        &self,
        tenant_id: TenantId,
        slot_id: Uuid,
    ) -> TempoResult<()> {
        self.repo
            .delete_availability_slot(&tenant_id, slot_id)
            .await
            .map_err(TempoServiceError::Repository)
    }

    pub async fn reschedule_booking(
        &self,
        tenant_id: TenantId,
        booking_id: Uuid,
        new_starts_at: DateTime<Utc>,
        expected_version: i32,
    ) -> TempoResult<Booking> {
        let booking_id_obj = BookingId(booking_id);
        let mut booking = self
            .repo
            .find_booking_by_id(&tenant_id, &booking_id_obj)
            .await
            .map_err(TempoServiceError::Repository)?
            .ok_or(TempoServiceError::BookingNotFound)?;

        if booking.version != expected_version {
            return Err(TempoServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, booking.version
            )));
        }

        tempo_domain::reschedule_booking(&mut booking, new_starts_at.into());
        booking.version += 1;

        self.repo
            .reschedule_booking(&tenant_id, &booking_id_obj, booking.starts_at.into())
            .await
            .map_err(TempoServiceError::Repository)?;

        self.repo
            .update_booking_version(&tenant_id, &booking_id_obj, booking.version)
            .await
            .map_err(TempoServiceError::Repository)?;

        Ok(booking)
    }

    pub async fn public_create_booking(
        &self,
        tenant_id: TenantId,
        slug: String,
        starts_at: DateTime<Utc>,
        timezone: String,
        invitee_name: String,
        invitee_email: String,
    ) -> TempoResult<Booking> {
        let event_type = self.get_event_type_by_slug(tenant_id, slug).await?;
        if !event_type.is_active {
            return Err(TempoServiceError::Validation(
                "Event type is not active".to_string(),
            ));
        }

        // Emit an outbox event to create a CINQ contact for the invitee
        let contact_payload = serde_json::json!({
            "tenant_id": tenant_id.as_uuid(),
            "name": invitee_name,
            "email": invitee_email,
            "source": "tempo_booking"
        });

        self.outbox
            .append(
                "collab_crm",
                "TempoInviteeCreated",
                Uuid::new_v4(),
                &contact_payload,
            )
            .await
            .map_err(|e| {
                TempoServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
            })?;

        let cmd = CreateBookingCommand {
            tenant_id,
            event_type_id: event_type.id.0,
            starts_at,
            duration_minutes: event_type.duration_minutes,
            timezone,
            contact_id: None, // Contact will be linked by the consumer
        };
        self.create_booking(cmd).await
    }
}
