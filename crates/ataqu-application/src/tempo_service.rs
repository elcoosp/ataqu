//! TEMPO scheduling service – in-memory bookings with outbox events.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use serde_json::json;

#[derive(Debug, Clone)]
pub struct Booking {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub event_type: String,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateBookingCommand {
    pub tenant_id: TenantId,
    pub event_type: String,
    pub starts_at: DateTime<Utc>,
    pub duration_minutes: i32,
}

#[derive(Debug, Clone)]
pub struct OutboxEvent {
    pub id: i64,
    pub schema: String,
    pub event_type: String,
    pub aggregate_id: Uuid,
    pub payload: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, thiserror::Error)]
pub enum TempoServiceError {
    #[error("Booking not found")]
    BookingNotFound,
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Outbox error: {0}")]
    Outbox(String),
}

pub type TempoResult<T> = Result<T, TempoServiceError>;

#[derive(Default)]
struct BookingStore {
    bookings: Arc<RwLock<HashMap<Uuid, Booking>>>,
}

// Outbox trait (simplified)
pub trait OutboxAppender: Send + Sync {
    fn append_event(&self, schema: &str, event_type: &str, aggregate_id: Uuid, payload: serde_json::Value) -> Result<(), String>;
}

// Dummy outbox that just prints
pub struct DummyOutbox;
impl OutboxAppender for DummyOutbox {
    fn append_event(&self, _schema: &str, _event_type: &str, _aggregate_id: Uuid, _payload: serde_json::Value) -> Result<(), String> {
        // In real impl, insert into DB
        Ok(())
    }
}

pub struct TempoService {
    bookings: BookingStore,
    outbox: Arc<dyn OutboxAppender>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl TempoService {
    pub fn new(
        outbox: Arc<dyn OutboxAppender>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            bookings: BookingStore::default(),
            outbox,
            id_gen,
            clock,
        }
    }

    pub async fn create_booking(&self, cmd: CreateBookingCommand) -> TempoResult<Booking> {
        if cmd.event_type.trim().is_empty() {
            return Err(TempoServiceError::Validation("Event type cannot be empty".into()));
        }
        if cmd.duration_minutes <= 0 {
            return Err(TempoServiceError::Validation("Duration must be positive".into()));
        }
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let event_type = cmd.event_type.clone(); // Clone to use later
        let booking = Booking {
            id,
            tenant_id: cmd.tenant_id,
            event_type: event_type.clone(), // Use cloned value
            starts_at: cmd.starts_at,
            duration_minutes: cmd.duration_minutes,
            status: "pending".to_string(),
            created_at: now,
        };
        self.bookings.bookings.write().unwrap().insert(id, booking.clone());

        // Append outbox event
        let payload = json!({
            "booking_id": id,
            "tenant_id": cmd.tenant_id,
            "event_type": event_type, // Use the cloned variable
            "starts_at": cmd.starts_at,
        });
        if let Err(e) = self.outbox.append_event("collab_ops", "BookingCreated", id, payload) {
            return Err(TempoServiceError::Outbox(e));
        }
        Ok(booking)
    }

    pub async fn get_booking(&self, tenant_id: TenantId, id: Uuid) -> TempoResult<Booking> {
        let map = self.bookings.bookings.read().unwrap();
        map.get(&id)
            .filter(|b| b.tenant_id == tenant_id)
            .cloned()
            .ok_or(TempoServiceError::BookingNotFound)
    }

    pub async fn list_bookings(&self, tenant_id: TenantId) -> TempoResult<Vec<Booking>> {
        let map = self.bookings.bookings.read().unwrap();
        let bookings = map.values().filter(|b| b.tenant_id == tenant_id).cloned().collect();
        Ok(bookings)
    }

    pub async fn cancel_booking(&self, tenant_id: TenantId, id: Uuid) -> TempoResult<Booking> {
        let mut map = self.bookings.bookings.write().unwrap();
        let mut booking = map.get(&id).cloned().ok_or(TempoServiceError::BookingNotFound)?;
        if booking.tenant_id != tenant_id {
            return Err(TempoServiceError::BookingNotFound);
        }
        booking.status = "cancelled".to_string();
        map.insert(id, booking.clone());

        // Append outbox event
        let payload = json!({ "booking_id": id, "tenant_id": tenant_id });
        if let Err(e) = self.outbox.append_event("collab_ops", "BookingCancelled", id, payload) {
            return Err(TempoServiceError::Outbox(e));
        }
        Ok(booking)
    }
}
