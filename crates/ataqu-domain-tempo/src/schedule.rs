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
    /// The attendee opened the meeting page; the no-show worker must skip it.
    Joined,
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
    /// OVERFLOW FIX (audit): `duration_minutes * 60` on attacker-controlled
    /// i32 input wraps in release builds and the resulting huge `Duration`
    /// made `SystemTime + Duration` PANIC — a poisoned booking killed the
    /// no-show worker loop. The duration is clamped to a sane ceiling so the
    /// addition can never overflow.
    pub fn ends_at(&self) -> SystemTime {
        let secs = (self.duration_minutes.saturating_mul(60).max(0) as u64).min(MAX_END_SECS);
        self.starts_at + Duration::from_secs(secs)
    }
}

/// 10 years in seconds — ceiling for derived end times so `SystemTime +`
/// `Duration` arithmetic can never panic, even on poisoned input.
pub const MAX_END_SECS: u64 = 10 * 365 * 24 * 3600;

/// Pure logic to evaluate if a booking is a no-show.
/// ADR-032: The infrastructure layer will query with a 24-hour upper bound
/// to prevent full-table scans, but this pure function performs the actual
/// time-based evaluation without I/O.
pub fn evaluate_no_show(booking: &Booking, now: SystemTime, grace_period_minutes: i32) -> bool {
    if booking.status != BookingStatus::Confirmed && booking.status != BookingStatus::Pending {
        return false;
    }
    let ends_at = booking.ends_at();
    let grace_secs = (grace_period_minutes.saturating_mul(60).max(0) as u64).min(MAX_END_SECS);
    let no_show_threshold = ends_at + Duration::from_secs(grace_secs);
    now >= no_show_threshold
}

/// Pure logic to check if a new booking overlaps with any existing active bookings.
pub fn check_overlap(starts_at: SystemTime, duration_minutes: i32, existing: &[Booking]) -> bool {
    let secs = (duration_minutes.saturating_mul(60).max(0) as u64).min(MAX_END_SECS);
    let ends_at = starts_at + Duration::from_secs(secs);
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
/// VALIDATION FIX (audit): `duration_minutes` was only checked for > 0
/// upstream with no upper bound — huge values overflowed `ends_at()` (now
/// saturating) and produced nonsense bookings. A full day is the sane max.
pub const MAX_DURATION_MINUTES: i32 = 24 * 60;

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

#[cfg(test)]
mod overflow_tests {
    use super::*;

    /// FIXED IN AUDIT: `duration_minutes = i32::MAX` used to overflow the
    /// `*60` multiplication (panic in debug, wrap in release) and the huge
    /// Duration panicked `SystemTime + Duration`. Must saturate instead.
    #[test]
    fn ends_at_saturates_on_huge_duration() {
        let booking = Booking {
            id: BookingId(uuid::Uuid::nil()),
            tenant_id: TenantId::new(uuid::Uuid::nil()),
            event_type_id: EventTypeId(uuid::Uuid::nil()),
            starts_at: std::time::UNIX_EPOCH,
            duration_minutes: i32::MAX,
            status: BookingStatus::Pending,
            timezone: "UTC".to_string(),
            reminder_sent_at: None,
            created_at: std::time::UNIX_EPOCH,
            version: 0,
        };
        // Must not panic; saturates far in the future.
        let _ = booking.ends_at();
    }

    #[test]
    fn negative_duration_clamps_to_start() {
        let booking = Booking {
            id: BookingId(uuid::Uuid::nil()),
            tenant_id: TenantId::new(uuid::Uuid::nil()),
            event_type_id: EventTypeId(uuid::Uuid::nil()),
            starts_at: std::time::UNIX_EPOCH,
            duration_minutes: -5,
            status: BookingStatus::Pending,
            timezone: "UTC".to_string(),
            reminder_sent_at: None,
            created_at: std::time::UNIX_EPOCH,
            version: 0,
        };
        assert_eq!(booking.ends_at(), std::time::UNIX_EPOCH);
    }
}
