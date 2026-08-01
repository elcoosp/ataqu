//! Core traits for dependency injection and capability-based design.
//!
//! The domain layer is pure: it performs no I/O and reads no system state.
//! Instead, capabilities (UUID generation, clock access) are injected via
//! the traits defined here (ADR-013).

use std::time::SystemTime;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Identifiable  (ADR-014)
// ---------------------------------------------------------------------------

/// Trait for entities that expose a stable unique identifier.
///
/// Used by the generic `transactional_batch_insert` helper and other
/// infrastructure code to uniformly access entity IDs without coupling
/// to concrete types.
///
/// # Examples
///
/// ```
/// use ataqu_kernel::Identifiable;
/// use uuid::Uuid;
///
/// struct Contact {
///     id: Uuid,
///     name: String,
/// }
///
/// impl Identifiable for Contact {
///     fn id(&self) -> Uuid {
///         self.id
///     }
/// }
///
/// let c = Contact { id: Uuid::new_v4(), name: "Alice".into() };
/// let _id: Uuid = c.id();
/// ```
pub trait Identifiable {
    /// Returns the unique identifier of the entity.
    fn id(&self) -> Uuid;
}

// ---------------------------------------------------------------------------
// IdGenerator  (ADR-013)
// ---------------------------------------------------------------------------

/// Impure capability for generating UUIDs.
///
/// This trait is injected into domain pure functions so that the domain
/// layer never reads the system RNG directly. `IdGenerator` is used
/// **only** for UUID generation; use [`Clock`] for timestamps.
///
/// The canonical implementation (`SystemIdGenerator`) lives in the
/// application layer and produces UUIDv7 values.
///
/// # Testability
///
/// Tests inject a `MockIdGenerator` that returns deterministic UUIDs,
/// enabling fully reproducible domain tests.
pub trait IdGenerator: Send + Sync {
    /// Generates a new UUIDv7 (time-ordered, lexicographically sortable).
    fn new_uuid_v7(&self) -> Uuid;
}

// ---------------------------------------------------------------------------
// Clock  (ADR-013)
// ---------------------------------------------------------------------------

/// Impure capability for reading the system clock.
///
/// This trait is injected into domain pure functions so that the domain
/// layer never reads the system clock directly. `Clock` is used **only**
/// for high-precision `SystemTime`; use [`IdGenerator`] for UUIDs.
///
/// # Why not derive time from UUIDv7?
///
/// Deriving `SystemTime` from the UUIDv7 timestamp truncates to
/// milliseconds and introduces panic risks via `unwrap()`. Keeping
/// `Clock` separate preserves high-precision timing and removes the
/// panic vector (ADR-013).
///
/// # Testability
///
/// Tests inject a `MockClock` that returns a fixed `SystemTime`,
/// enabling fully reproducible domain tests.
pub trait Clock: Send + Sync {
    /// Returns the current system time with high precision.
    fn now(&self) -> SystemTime;
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;

    // -----------------------------------------------------------------------
    // Test doubles
    // -----------------------------------------------------------------------

    struct TestEntity {
        id: Uuid,
    }

    impl Identifiable for TestEntity {
        fn id(&self) -> Uuid {
            self.id
        }
    }

    /// Mock `IdGenerator` that returns sequential UUIDs for deterministic tests.
    struct MockIdGenerator {
        next: Mutex<Uuid>,
    }

    impl MockIdGenerator {
        fn new(initial: Uuid) -> Self {
            Self {
                next: Mutex::new(initial),
            }
        }
    }

    impl IdGenerator for MockIdGenerator {
        fn new_uuid_v7(&self) -> Uuid {
            let mut guard = self.next.lock().unwrap();
            let current = *guard;
            *guard = Uuid::from_u128(current.as_u128() + 1);
            current
        }
    }

    /// Mock `Clock` that returns a fixed `SystemTime`.
    struct MockClock {
        fixed: SystemTime,
    }

    impl Clock for MockClock {
        fn now(&self) -> SystemTime {
            self.fixed
        }
    }

    // -----------------------------------------------------------------------
    // Identifiable tests
    // -----------------------------------------------------------------------

    #[test]
    fn identifiable_returns_id() {
        let id = Uuid::new_v4();
        let entity = TestEntity { id };
        assert_eq!(entity.id(), id);
    }

    // -----------------------------------------------------------------------
    // IdGenerator tests
    // -----------------------------------------------------------------------

    #[test]
    fn id_generator_returns_uuid() {
        let generator = MockIdGenerator::new(Uuid::nil());
        let uuid = generator.new_uuid_v7();
        assert_eq!(uuid, Uuid::nil());
    }

    #[test]
    fn id_generator_returns_increasing_uuids() {
        let generator = MockIdGenerator::new(Uuid::from_u128(100));
        let a = generator.new_uuid_v7();
        let b = generator.new_uuid_v7();
        assert_eq!(a, Uuid::from_u128(100));
        assert_eq!(b, Uuid::from_u128(101));
    }

    #[test]
    fn id_generator_is_send_sync() {
        fn assert_send_sync<T: Send + Sync + ?Sized>() {}
        assert_send_sync::<MockIdGenerator>();
        assert_send_sync::<dyn IdGenerator>();
    }

    #[test]
    fn id_generator_can_be_shared_across_threads() {
        let generator = Arc::new(MockIdGenerator::new(Uuid::from_u128(1)));
        let generator_clone = Arc::clone(&generator);
        let handle = std::thread::spawn(move || generator_clone.new_uuid_v7());
        let uuid_a = handle.join().unwrap();
        let uuid_b = generator.new_uuid_v7();
        assert_eq!(uuid_a, Uuid::from_u128(1));
        assert_eq!(uuid_b, Uuid::from_u128(2));
    }

    // -----------------------------------------------------------------------
    // Clock tests
    // -----------------------------------------------------------------------

    #[test]
    fn clock_returns_fixed_time() {
        let fixed = SystemTime::UNIX_EPOCH + Duration::from_secs(1_000_000);
        let clock = MockClock { fixed };
        assert_eq!(clock.now(), fixed);
    }

    #[test]
    fn clock_is_send_sync() {
        fn assert_send_sync<T: Send + Sync + ?Sized>() {}
        assert_send_sync::<MockClock>();
        assert_send_sync::<dyn Clock>();
    }

    #[test]
    fn clock_can_be_shared_across_threads() {
        let clock = Arc::new(MockClock {
            fixed: SystemTime::UNIX_EPOCH,
        });
        let clock_clone = Arc::clone(&clock);
        let handle = std::thread::spawn(move || clock_clone.now());
        let time = handle.join().unwrap();
        assert_eq!(time, SystemTime::UNIX_EPOCH);
    }
}
