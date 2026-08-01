//! Core domain types for the Ataqu platform.
//!
//! This module defines foundational newtypes that enforce architectural
//! invariants at compile time.

use std::fmt;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// TenantId  (ADR-024)
// ---------------------------------------------------------------------------

/// A tenant identifier backed by a `Uuid` with a **private inner field**.
///
/// The private field prevents direct construction or field access outside
/// of the provided API, ensuring that tenant identifiers always flow through
/// controlled channels. This is a key enforcement mechanism for tenant
/// isolation (ADR-024).
///
/// # Examples
///
/// ```
/// use ataqu_kernel::TenantId;
/// use uuid::Uuid;
///
/// let id = Uuid::new_v4();
/// let tenant = TenantId::new(id);
/// assert_eq!(tenant.as_uuid(), id);
/// ```
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct TenantId(Uuid);

impl TenantId {
    /// Creates a new `TenantId` from a `Uuid`.
    #[inline]
    pub fn new(id: Uuid) -> Self {
        Self(id)
    }

    /// Returns the inner `Uuid`.
    ///
    /// This is the only way to access the raw `Uuid` value, making all
    /// access points auditable.
    #[inline]
    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

impl From<Uuid> for TenantId {
    #[inline]
    fn from(id: Uuid) -> Self {
        Self(id)
    }
}

impl fmt::Debug for TenantId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_tuple("TenantId").field(&self.0).finish()
    }
}

impl fmt::Display for TenantId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tenant_id_new_and_as_uuid_roundtrip() {
        let id = Uuid::new_v4();
        let tenant = TenantId::new(id);
        assert_eq!(tenant.as_uuid(), id);
    }

    #[test]
    fn tenant_id_from_uuid() {
        let id = Uuid::new_v4();
        let tenant: TenantId = id.into();
        assert_eq!(tenant.as_uuid(), id);
    }

    #[test]
    fn tenant_id_debug_format_contains_uuid() {
        let id = Uuid::new_v4();
        let tenant = TenantId::new(id);
        let debug_str = format!("{:?}", tenant);
        assert!(debug_str.starts_with("TenantId("));
        assert!(debug_str.contains(&id.to_string()));
    }

    #[test]
    fn tenant_id_display_matches_uuid() {
        let id = Uuid::new_v4();
        let tenant = TenantId::new(id);
        assert_eq!(format!("{}", tenant), id.to_string());
    }

    #[test]
    fn tenant_id_equality() {
        let id = Uuid::new_v4();
        let a = TenantId::new(id);
        let b = TenantId::new(id);
        let c = TenantId::new(Uuid::new_v4());
        assert_eq!(a, b);
        assert_ne!(a, c);
    }

    #[test]
    fn tenant_id_copy_semantics() {
        let id = Uuid::new_v4();
        let original = TenantId::new(id);
        let copied = original;
        assert_eq!(original, copied);
    }

    #[test]
    fn tenant_id_ordering() {
        let ids: Vec<TenantId> = vec![
            TenantId::new(Uuid::from_u128(3)),
            TenantId::new(Uuid::from_u128(1)),
            TenantId::new(Uuid::from_u128(2)),
        ];
        let mut sorted = ids.clone();
        sorted.sort();
        assert_eq!(sorted[0].as_uuid(), Uuid::from_u128(1));
        assert_eq!(sorted[1].as_uuid(), Uuid::from_u128(2));
        assert_eq!(sorted[2].as_uuid(), Uuid::from_u128(3));
    }

    #[test]
    fn tenant_id_works_as_hashmap_key() {
        let mut map = std::collections::HashMap::new();
        let t1 = TenantId::new(Uuid::from_u128(1));
        let t2 = TenantId::new(Uuid::from_u128(2));
        map.insert(t1, "tenant-a");
        map.insert(t2, "tenant-b");
        assert_eq!(map.get(&t1), Some(&"tenant-a"));
        assert_eq!(map.get(&t2), Some(&"tenant-b"));
    }

    #[test]
    fn tenant_id_is_send_sync() {
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<TenantId>();
    }

    #[test]
    fn tenant_id_nil_uuid_is_valid() {
        let tenant = TenantId::new(Uuid::nil());
        assert_eq!(tenant.as_uuid(), Uuid::nil());
    }
}
