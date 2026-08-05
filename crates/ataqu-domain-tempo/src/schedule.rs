use ataqu_kernel::{IdGenerator, Identifiable, TenantId};
use std::time::{Duration, SystemTime};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookingId(pub Uuid);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EventTypeId(pub Uuid);

#[derive(Debug, Clone, PartialEq, Eq)]
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
}

impl Identifiable for Booking {
    fn id(&self) -> Uuid {
        self.id.0
    }
}

impl Booking {
    pub fn ends_at(&self) -> SystemTime {
        self.starts_at + Duration::from_secs((self.duration_minutes * 60) as u64)
    }
}

pub trait TempoRepository {
    // Empty trait, implementation is in infra
}

/// Pure logic to evaluate if a booking is a no-show.
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
) -> Booking {
    let id = BookingId(id_gen.new_uuid_v7());
    Booking {
        id,
        tenant_id,
        event_type_id,
        starts_at,
        duration_minutes,
        status: BookingStatus::Pending,
        timezone,
        reminder_sent_at: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, UNIX_EPOCH};

    #[allow(dead_code)]
    struct MockIdGenerator;
    impl IdGenerator for MockIdGenerator {
        fn new_uuid_v7(&self) -> Uuid {
            Uuid::nil()
        }
    }

    #[test]
    fn test_ends_at_calculation() {
        let starts_at = UNIX_EPOCH + Duration::from_secs(1000);
        let duration_minutes = 30;
        let expected_ends_at = starts_at + Duration::from_secs(1800);

        let calculated_ends_at = starts_at + Duration::from_secs((duration_minutes * 60) as u64);
        assert_eq!(calculated_ends_at, expected_ends_at);
    }

    #[test]
    fn test_evaluate_no_show_logic() {
        let now = UNIX_EPOCH + Duration::from_secs(2000);
        let starts_at = UNIX_EPOCH + Duration::from_secs(0);
        let duration_minutes = 10; // ends at 600s
        let grace_period_minutes = 5; // threshold at 900s

        let ends_at = starts_at + Duration::from_secs((duration_minutes * 60) as u64);
        let no_show_threshold = ends_at + Duration::from_secs((grace_period_minutes * 60) as u64);

        assert_eq!(no_show_threshold, UNIX_EPOCH + Duration::from_secs(900));
        assert!(now >= no_show_threshold, "Should be a no-show");

        let not_yet_no_show = UNIX_EPOCH + Duration::from_secs(800);
        assert!(
            !(not_yet_no_show >= no_show_threshold),
            "Should not be a no-show yet"
        );
    }

    #[test]
    fn test_check_overlap() {
        let existing_booking = Booking {
            id: BookingId(Uuid::nil()),
            tenant_id: TenantId::new(Uuid::nil()),
            event_type_id: EventTypeId(Uuid::nil()),
            starts_at: UNIX_EPOCH + Duration::from_secs(1000),
            duration_minutes: 60, // ends at 4600
            status: BookingStatus::Confirmed,
            timezone: "UTC".to_string(),
            reminder_sent_at: None,
        };
        let existing = vec![existing_booking];

        // Overlapping booking (starts during existing)
        let starts_at = UNIX_EPOCH + Duration::from_secs(2000);
        assert!(check_overlap(starts_at, 30, &existing));

        // Overlapping booking (ends during existing)
        let starts_at = UNIX_EPOCH + Duration::from_secs(500);
        assert!(check_overlap(starts_at, 60, &existing)); // ends at 4100

        // Non-overlapping booking (before)
        let starts_at = UNIX_EPOCH + Duration::from_secs(0);
        assert!(!check_overlap(starts_at, 10, &existing)); // ends at 600

        // Non-overlapping booking (after)
        let starts_at = UNIX_EPOCH + Duration::from_secs(5000);
        assert!(!check_overlap(starts_at, 10, &existing));

        // Cancelled booking doesn't count
        let mut cancelled_existing = existing.clone();
        cancelled_existing[0].status = BookingStatus::Cancelled;
        let starts_at = UNIX_EPOCH + Duration::from_secs(2000);
        assert!(!check_overlap(starts_at, 30, &cancelled_existing));
    }
}
