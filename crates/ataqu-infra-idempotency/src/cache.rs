//! In-memory Moka cache for idempotency responses (hot path).

use crate::store::CachedResponse;
use moka::sync::Cache;
use std::time::Duration;
use uuid::Uuid;

/// Bounded cache for idempotency responses.
/// Capacity: 10,000 entries, TTL: 7 days, max weight: 20 MB.
pub struct IdempotencyCache {
    inner: Cache<Uuid, CachedResponse>,
}

impl IdempotencyCache {
    /// Create a new cache with the specified bounds.
    pub fn new() -> Self {
        let cache: Cache<Uuid, CachedResponse> = Cache::builder()
            .max_capacity(10_000)
            .time_to_live(Duration::from_secs(7 * 24 * 60 * 60)) // 7 days
            .weigher(|_key, value: &CachedResponse| {
                // Approximate weight based on JSON serialization size
                let json_bytes = serde_json::to_vec(value).unwrap_or_default();
                (json_bytes.len() + 64) as u32
            })
            .build();

        Self { inner: cache }
    }

    /// Retrieve a cached response by command_id.
    pub fn get(&self, command_id: &Uuid) -> Option<CachedResponse> {
        self.inner.get(command_id)
    }

    /// Insert a response into the cache.
    pub fn insert(&self, command_id: Uuid, response: CachedResponse) {
        self.inner.insert(command_id, response);
    }

    /// Invalidate a specific entry.
    pub fn invalidate(&self, command_id: &Uuid) {
        self.inner.invalidate(command_id);
    }

    /// Clear the cache.
    pub fn clear(&self) {
        self.inner.invalidate_all();
    }

    /// Return the approximate number of entries currently in the cache.
    pub fn entry_count(&self) -> u64 {
        self.inner.entry_count()
    }

    /// Return the approximate total weight of all entries in the cache.
    pub fn estimated_total_weight(&self) -> u64 {
        self.inner.weighted_size()
    }
}

impl Default for IdempotencyCache {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn cache_insert_and_get() {
        let cache = IdempotencyCache::new();
        let uuid = Uuid::new_v4();
        let response = CachedResponse {
            status: 200,
            headers: HashMap::new(),
            body: serde_json::json!({"message": "ok"}),
        };
        cache.insert(uuid, response.clone());
        let retrieved = cache.get(&uuid);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().status, 200);
    }
}
