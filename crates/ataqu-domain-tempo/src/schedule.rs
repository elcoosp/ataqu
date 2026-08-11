use ataqu_kernel::{Clock, IdGenerator, Identifiable, TenantId};
use std::time::{Duration, SystemTime};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookingId(pub Uuid);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EventTypeId(pub Uuid);

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BookingStatus {
    Pending,
    Confirmed,
    Cancelled,
    Completed,
    NoShow,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Booking {
    pub id: BookingId,
    pub tenant_id: TenantId,
    pub event_type_id: EventTypeId,
    pub starts_at: SystemTime,
    pub duration_minutes: i32,
    pub status: BookingStatus,
    pub timezone: String,
    pub reminder_sent_at: Option<SystemTime>,
    pub created_at: SystemTime,
    pub version: i32,
}

impl Identifiable for Booking {
    fn id(&self) -> Uuid {
        self.id.0
    }
}

impl Booking {
    /// Returns the calculated end time of the booking.
    /// This aligns with ADR-032: `ends_at` is derived from `starts_at + duration`.
    pub fn ends_at(&self) -> SystemTime {
        self.starts_at + Duration::from_secs((self.duration_minutes * 60) as u64)
    }
}

/// Pure logic to evaluate if a booking is a no-show.
/// ADR-032: The infrastructure layer will query with a 24-hour upper bound
/// to prevent full-table scans, but this pure function performs the actual
/// time-based evaluation without I/O.
pub fn evaluate_no_show(booking: &Booking, now: SystemTime, grace_period_minutes: i32) -> bool {
    if booking.status != BookingStatus::Confirmed && booking.status != BookingStatus::Pending {
        return false;
    }
    let ends_at = booking.ends_at();
    let no_show_threshold = ends_at + Duration::from_secs((grace_period_minutes * 60) as u64);
    now >= no_show_threshold
}

/// Pure logic to check if a new booking overlaps with any existing active bookings.
pub fn check_overlap(starts_at: SystemTime, duration_minutes: i32, existing: &[Booking]) -> bool {
    let ends_at = starts_at + Duration::from_secs((duration_minutes * 60) as u64);
    for b in existing {
        if b.status != BookingStatus::Cancelled && b.status != BookingStatus::Completed {
            let b_ends_at = b.ends_at();
            if starts_at < b_ends_at && ends_at > b.starts_at {
                return true; // Overlap found
            }
        }
    }
    false
}

/// Pure function to create a new booking.
pub fn create_booking(
    tenant_id: TenantId,
    event_type_id: EventTypeId,
    starts_at: SystemTime,
    duration_minutes: i32,
    timezone: String,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Booking {
    let id = BookingId(id_gen.new_uuid_v7());
    let now = clock.now();
    Booking {
        id,
        tenant_id,
        event_type_id,
        starts_at,
        duration_minutes,
        status: BookingStatus::Pending,
        timezone,
        reminder_sent_at: None,
        created_at: now,
        version: 0,
    }
}

pub fn reschedule_booking(booking: &mut Booking, new_starts_at: SystemTime) {
    booking.starts_at = new_starts_at;
}
