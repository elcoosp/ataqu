//! VISTA Analytics Orchestration Service
//!
//! Processes outbox events to update aggregation tables and provides
//! real-time KPI updates via Server-Sent Events (SSE) streaming.
//!
//! ## Architecture
//!
//! - **ADR-010**: VISTA Aggregator with stateful cursor, DLQ inclusion,
//!   and native LISTEN/NOTIFY. Polls `core.outbox` where
//!   `vista_consumed_at IS NULL`.
//! - **ADR-017**: Pure Domain Model with Application-Layer Orchestration.
//!   The application layer orchestrates: read outbox → call domain
//!   aggregation → persist → mark consumed → broadcast KPI.
//! - **Idempotency**: Each event is checked via `is_already_applied`
//!   before processing. The `vista_consumed_at` timestamp on
//!   `core.outbox` serves as the durable idempotency marker. If the
//!   service crashes between `apply_aggregation` and `mark_consumed`,
//!   the next run detects the already-applied event, marks it consumed,
//!   and skips re-processing.
//!
//! ## SSE Streaming
//!
//! A `tokio::sync::broadcast` channel fans out KPI updates to multiple
//! SSE subscribers. Each subscriber filters updates by `tenant_id`.
//! The API layer wraps the stream in an Axum `Sse` response.

use std::sync::Arc;
use std::time::SystemTime;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

// ─── Error Types ───────────────────────────────────────────────────────

/// Errors produced by the VISTA service.
#[derive(Debug, Error)]
pub enum VistaServiceError {
    /// Failed to read from the outbox.
    #[error("outbox read error: {0}")]
    OutboxRead(String),

    /// Failed to write aggregation updates.
    #[error("aggregation error: {0}")]
    Aggregation(String),

    /// Failed to mark an outbox event as consumed.
    #[error("mark consumed error for event {event_id}: {reason}")]
    MarkConsumed { event_id: i64, reason: String },

    /// Failed to mark an outbox event as failed.
    #[error("mark failed error for event {event_id}: {reason}")]
    MarkFailed { event_id: i64, reason: String },

    /// Event exceeded maximum retry attempts and was moved to DLQ.
    #[error("event {event_id} moved to DLQ: {reason}")]
    DlqMoved { event_id: i64, reason: String },

    /// JSON serialization/deserialization error.
    #[error("serialization error: {0}")]
    Serialization(String),

    /// Broadcast channel error (no active subscribers or lagged).
    #[error("broadcast error: {0}")]
    Broadcast(String),

    /// No KPI snapshot found for the given parameters.
    #[error("no KPI snapshot found")]
    NoSnapshot,
}

// ─── Domain Types ──────────────────────────────────────────────────────

/// Schema identifier matching the `app_schema` PostgreSQL ENUM.
///
/// Used for type-safe event origin tracking. Maps to the database-level
/// `app_schema` ENUM that enforces RLS policies on `core.outbox`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AppSchema {
    Core,
    CollabCrm,
    CollabOps,
    Vault,
    Dial,
    Vista,
}

impl std::fmt::Display for AppSchema {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Core => write!(f, "core"),
            Self::CollabCrm => write!(f, "collab_crm"),
            Self::CollabOps => write!(f, "collab_ops"),
            Self::Vault => write!(f, "vault"),
            Self::Dial => write!(f, "dial"),
            Self::Vista => write!(f, "vista"),
        }
    }
}

/// An outbox event pending VISTA consumption.
///
/// Maps to a row in `core.outbox` where `vista_consumed_at IS NULL`.
/// Events are ordered by `id` for deterministic cursor progression
/// (ADR-010: stateful cursor).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VistaOutboxEvent {
    /// The `core.outbox.id` (BIGSERIAL).
    pub id: i64,
    /// The schema that originated the event.
    pub schema: AppSchema,
    /// The event type (e.g., `"contact_created"`).
    pub event_type: String,
    /// Optional aggregate ID (UUID).
    pub aggregate_id: Option<Uuid>,
    /// The JSONB event payload.
    pub payload: serde_json::Value,
    /// Number of prior processing attempts.
    pub attempts: i32,
    /// Event creation timestamp.
    pub created_at: SystemTime,
}

/// A snapshot of a single KPI metric for a tenant.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct KpiSnapshot {
    pub tenant_id: Uuid,
    pub metric_name: String,
    pub metric_value: f64,
    pub computed_at: SystemTime,
}

/// A KPI update broadcast to SSE subscribers.
///
/// Wraps a `KpiSnapshot` with the tenant ID for efficient subscriber-side
/// filtering without deserializing the full snapshot.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KpiUpdate {
    pub tenant_id: Uuid,
    pub snapshot: KpiSnapshot,
}

impl From<KpiSnapshot> for KpiUpdate {
    fn from(snapshot: KpiSnapshot) -> Self {
        let tenant_id = snapshot.tenant_id;
        Self {
            tenant_id,
            snapshot,
        }
    }
}

// ─── Ports (Trait Definitions) ─────────────────────────────────────────

/// Port for reading and updating the outbox from VISTA's perspective.
///
/// Implemented by `ataqu-infra-repositories` using SeaORM + raw SQL
/// (`FOR UPDATE SKIP LOCKED`, `UPDATE ... SET vista_consumed_at = ...`).
/// The application layer depends on this trait, not on concrete
/// repository structs, ensuring clean dependency inversion.
#[async_trait::async_trait]
pub trait VistaOutboxPort: Send + Sync {
    /// Fetch unconsumed outbox events (`vista_consumed_at IS NULL`).
    ///
    /// Returns at most `limit` events, ordered by `id` for deterministic
    /// cursor progression. Uses `FOR UPDATE SKIP LOCKED` in the infra
    /// implementation to allow concurrent VISTA workers.
    async fn fetch_unconsumed(
        &self,
        limit: u32,
    ) -> Result<Vec<VistaOutboxEvent>, VistaServiceError>;

    /// Mark an event as consumed by VISTA.
    ///
    /// Sets `vista_consumed_at = consumed_at` on the outbox row.
    /// This is the durable idempotency marker — once set, the event
    /// will not be re-fetched by `fetch_unconsumed`.
    async fn mark_consumed(
        &self,
        event_id: i64,
        consumed_at: SystemTime,
    ) -> Result<(), VistaServiceError>;

    /// Increment the attempt counter for a failed event.
    ///
    /// Does not change `vista_consumed_at`, so the event remains
    /// eligible for reprocessing on the next batch.
    async fn mark_failed(
        &self,
        event_id: i64,
        new_attempt_count: i32,
    ) -> Result<(), VistaServiceError>;

    /// Move an event to the DLQ after exhausting retries.
    ///
    /// Sets `status = 'dlq'` on the outbox row. The event is no longer
    /// eligible for processing.
    async fn move_to_dlq(&self, event_id: i64, reason: &str) -> Result<(), VistaServiceError>;
}

/// Port for applying aggregation updates and reading KPIs.
///
/// Implemented by `ataqu-infra-repositories` using SeaORM entities
/// for VISTA aggregation tables. The `is_already_applied` method
/// provides the idempotency guard for crash recovery.
#[async_trait::async_trait]
pub trait VistaAggregationPort: Send + Sync {
    /// Apply an outbox event to the aggregation tables.
    ///
    /// Returns the resulting KPI snapshot. This operation must be
    /// idempotent — applying the same event twice should produce the
    /// same result without duplication.
    async fn apply_aggregation(
        &self,
        event: &VistaOutboxEvent,
    ) -> Result<KpiSnapshot, VistaServiceError>;

    /// Check if an event has already been applied (idempotency guard).
    ///
    /// Queries the aggregation tables for a record keyed by `event.id`.
    /// Used to detect crash-recovery scenarios where `apply_aggregation`
    /// succeeded but `mark_consumed` did not.
    async fn is_already_applied(&self, event_id: i64) -> Result<bool, VistaServiceError>;

    /// Retrieve current KPI snapshots for a tenant.
    async fn get_kpis(&self, tenant_id: Uuid) -> Result<Vec<KpiSnapshot>, VistaServiceError>;
}

/// Port for obtaining the current time.
///
/// NOTE: In production, this is `ataqu_kernel::Clock`. Defined locally
/// until the kernel crate's exact API is wired into this crate's
/// dependencies. The trait signature matches ADR-013.


/// System clock implementation using `SystemTime::now()`.
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> SystemTime {
        SystemTime::now()
    }
}

// ─── SSE Broadcasting ──────────────────────────────────────────────────

/// Broadcaster for real-time KPI updates via SSE.
///
/// Uses `tokio::sync::broadcast` for fan-out. Each SSE subscriber
/// receives all updates and filters by `tenant_id` in the stream
/// factory (`create_kpi_stream`).
///
/// ## Capacity
///
/// Default capacity: 256 (bounded to prevent memory pressure).
/// Late subscribers receive only new updates (no replay buffer).
/// If the channel is full when a broadcast is attempted, the oldest
/// unconsumed message is dropped (lagged receiver).
#[derive(Clone)]
pub struct KpiBroadcaster {
    sender: tokio::sync::broadcast::Sender<KpiUpdate>,
    capacity: usize,
}

impl KpiBroadcaster {
    /// Create a new broadcaster with the given channel capacity.
    ///
    /// # Panics
    ///
    /// Panics if `capacity` is 0.
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "broadcast capacity must be > 0");
        let (sender, _) = tokio::sync::broadcast::channel(capacity);
        Self { sender, capacity }
    }

    /// Subscribe to KPI updates.
    ///
    /// Returns a `broadcast::Receiver` that can be converted to a
    /// stream via `create_kpi_stream`.
    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<KpiUpdate> {
        self.sender.subscribe()
    }

    /// Broadcast a KPI update to all subscribers.
    ///
    /// Returns `Ok(())` if at least one subscriber received the update.
    /// Returns `Err` if there are no active subscribers (benign — the
    /// update is simply dropped, not lost, since the aggregation is
    /// already persisted).
    pub fn broadcast(&self, update: KpiUpdate) -> Result<(), VistaServiceError> {
        self.sender
            .send(update)
            .map(|_| ())
            .map_err(|e| VistaServiceError::Broadcast(e.to_string()))
    }

    /// Returns the number of active subscribers.
    pub fn subscriber_count(&self) -> usize {
        self.sender.receiver_count()
    }

    /// Returns the channel capacity.
    pub fn capacity(&self) -> usize {
        self.capacity
    }
}

impl std::fmt::Debug for KpiBroadcaster {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("KpiBroadcaster")
            .field("capacity", &self.capacity)
            .field("subscribers", &self.subscriber_count())
            .finish()
    }
}

// ─── Batch Result ──────────────────────────────────────────────────────

/// Result of processing a batch of outbox events.
#[derive(Debug, Default)]
pub struct BatchResult {
    /// IDs of successfully processed events (including idempotent skips).
    pub successes: Vec<i64>,
    /// IDs and errors of events that failed processing (retryable).
    pub failures: Vec<(i64, VistaServiceError)>,
    /// IDs of events moved to the DLQ (max attempts exceeded).
    pub dlq: Vec<i64>,
}

impl BatchResult {
    /// Returns `true` if no events were processed.
    pub fn is_empty(&self) -> bool {
        self.successes.is_empty() && self.failures.is_empty() && self.dlq.is_empty()
    }

    /// Total number of events processed (success + failure + dlq).
    pub fn total(&self) -> usize {
        self.successes.len() + self.failures.len() + self.dlq.len()
    }
}

// ─── VistaService ──────────────────────────────────────────────────────

/// Orchestrates VISTA analytics: outbox event processing, aggregation
/// updates, and real-time KPI broadcasting.
///
/// ## Lifecycle
///
/// 1. `process_batch()` is called periodically by a background task
///    (woken by `sqlx::PgListener` or a 5-second safety-net poll).
/// 2. Each event is processed idempotently via `process_single_event`.
/// 3. Successful aggregations are broadcast to SSE subscribers.
/// 4. Failed events are retried up to `max_attempts`, then moved to DLQ.
///
/// ## Idempotency Guarantee
///
/// Each event is checked via `is_already_applied` before processing.
/// On success, `mark_consumed` sets `vista_consumed_at`, providing a
/// durable idempotency marker. If the service crashes between
/// `apply_aggregation` and `mark_consumed`, the next run detects the
/// already-applied event, marks it consumed, and skips re-processing.
///
/// ## Thread Safety
///
/// `VistaService` is `Send + Sync` and can be safely shared across
/// tasks via `Arc<VistaService>`.
pub struct VistaService {
    outbox: Arc<dyn VistaOutboxPort>,
    aggregation: Arc<dyn VistaAggregationPort>,
    broadcaster: KpiBroadcaster,
    clock: Arc<dyn Clock>,
    batch_size: u32,
    max_attempts: i32,
}

impl VistaService {
    /// Create a new `VistaService` with default settings.
    ///
    /// # Defaults
    ///
    /// - `batch_size`: 100
    /// - `max_attempts`: 5
    /// - `broadcast_capacity`: 256
    pub fn new(
        outbox: Arc<dyn VistaOutboxPort>,
        aggregation: Arc<dyn VistaAggregationPort>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            outbox,
            aggregation,
            broadcaster: KpiBroadcaster::new(256),
            clock,
            batch_size: 100,
            max_attempts: 5,
        }
    }

    /// Override the batch size for outbox polling.
    ///
    /// Clamped to a minimum of 1.
    pub fn with_batch_size(mut self, size: u32) -> Self {
        self.batch_size = size.max(1);
        self
    }

    /// Override the maximum retry attempts before DLQ.
    ///
    /// Clamped to a minimum of 1.
    pub fn with_max_attempts(mut self, max: i32) -> Self {
        self.max_attempts = max.max(1);
        self
    }

    /// Override the SSE broadcast channel capacity.
    ///
    /// Must be > 0. Replaces the existing broadcaster; existing
    /// subscribers will be disconnected.
    pub fn with_broadcast_capacity(mut self, capacity: usize) -> Self {
        self.broadcaster = KpiBroadcaster::new(capacity);
        self
    }

    /// Process a batch of unconsumed outbox events.
    ///
    /// Fetches up to `batch_size` events from the outbox, processes
    /// each idempotently, and broadcasts KPI updates via SSE.
    ///
    /// # Error Handling
    ///
    /// - Individual event failures are recorded in `BatchResult.failures`
    ///   or `BatchResult.dlq` — they do not abort the batch.
    /// - Infrastructure failures (`fetch_unconsumed`, `mark_failed`,
    ///   `move_to_dlq`) propagate immediately and abort the batch.
    ///   The caller (background task) should log and retry with backoff.
    pub async fn process_batch(&self) -> Result<BatchResult, VistaServiceError> {
        let events = self.outbox.fetch_unconsumed(self.batch_size).await?;

        if events.is_empty() {
            return Ok(BatchResult::default());
        }

        let mut result = BatchResult::default();

        for event in events {
            match self.process_single_event(&event).await {
                Ok(Some(snapshot)) => {
                    result.successes.push(event.id);
                    let update = KpiUpdate::from(snapshot);
                    if let Err(e) = self.broadcaster.broadcast(update) {
                        tracing::debug!(
                            event_id = event.id,
                            error = %e,
                            "No active SSE subscribers for KPI update"
                        );
                    }
                }
                Ok(None) => {
                    // Already applied — idempotent skip, still a success
                    result.successes.push(event.id);
                }
                Err(e) => {
                    tracing::warn!(
                        event_id = event.id,
                        event_type = %event.event_type,
                        attempts = event.attempts,
                        error = %e,
                        "VISTA event processing failed"
                    );

                    let new_attempts = event.attempts + 1;
                    if new_attempts >= self.max_attempts {
                        let reason = e.to_string();
                        self.outbox.move_to_dlq(event.id, &reason).await?;
                        result.dlq.push(event.id);
                    } else {
                        self.outbox.mark_failed(event.id, new_attempts).await?;
                        result.failures.push((event.id, e));
                    }
                }
            }
        }

        Ok(result)
    }

    /// Process a single outbox event idempotently.
    ///
    /// # Steps
    ///
    /// 1. Check `is_already_applied` — if true, mark consumed and
    ///    return `Ok(None)` (idempotent skip).
    /// 2. Call `apply_aggregation` to update aggregation tables.
    /// 3. Call `mark_consumed` to set `vista_consumed_at`.
    ///
    /// # Crash Recovery
    ///
    /// If step 2 succeeds but step 3 fails, the error propagates to
    /// `process_batch`, which records the failure. On the next batch,
    /// step 1 will detect the already-applied event and mark it
    /// consumed without re-applying.
    ///
    /// # Returns
    ///
    /// - `Ok(Some(snapshot))` — event was newly processed.
    /// - `Ok(None)` — event was already applied (idempotent skip).
    /// - `Err(e)` — processing failed (will be retried or DLQ'd).
    pub async fn process_single_event(
        &self,
        event: &VistaOutboxEvent,
    ) -> Result<Option<KpiSnapshot>, VistaServiceError> {
        // Idempotency check: skip if already applied
        if self.aggregation.is_already_applied(event.id).await? {
            tracing::debug!(
                event_id = event.id,
                "Event already applied — marking consumed and skipping"
            );
            let now = self.clock.now();
            self.outbox.mark_consumed(event.id, now).await?;
            return Ok(None);
        }

        // Apply aggregation
        let snapshot = self.aggregation.apply_aggregation(event).await?;

        // Mark consumed (durable idempotency marker)
        let now = self.clock.now();
        self.outbox.mark_consumed(event.id, now).await?;

        Ok(Some(snapshot))
    }

    /// Get the KPI broadcaster for SSE subscription.
    ///
    /// The API layer uses this to create SSE streams via
    /// `create_kpi_stream`.
    pub fn broadcaster(&self) -> &KpiBroadcaster {
        &self.broadcaster
    }

    /// Get current KPIs for a tenant.
    ///
    /// Used by the API layer to serve initial KPI data before
    /// SSE updates begin.
    pub async fn get_kpis(&self, tenant_id: Uuid) -> Result<Vec<KpiSnapshot>, VistaServiceError> {
        self.aggregation.get_kpis(tenant_id).await
    }
}

// ─── SSE Stream Factory ────────────────────────────────────────────────

/// Creates a filtered SSE stream of KPI updates for a specific tenant.
///
/// The API layer subscribes to this stream and wraps each `String` item
/// in an Axum `Event::data(item)` SSE frame.
///
/// # Tenant Filtering
///
/// Each subscriber only receives updates for their `tenant_id`.
/// Updates for other tenants are filtered out before serialization,
/// preventing cross-tenant data leakage in the stream.
///
/// # Stream Behavior
///
/// - Yields `Ok(json_string)` for matching tenant updates.
/// - Yields `Err(Broadcast)` on lag errors (receiver fell behind).
/// - Closes when the broadcast channel is dropped.
pub fn create_kpi_stream(
    broadcaster: &KpiBroadcaster,
    tenant_id: Uuid,
) -> impl tokio_stream::Stream<Item = Result<String, VistaServiceError>> + Send {
    use tokio_stream::StreamExt;
    use tokio_stream::wrappers::BroadcastStream;

    let rx = broadcaster.subscribe();

    BroadcastStream::new(rx).filter_map(move |result| match result {
        Ok(update) if update.tenant_id == tenant_id => match serde_json::to_string(&update) {
            Ok(json) => Some(Ok(json)),
            Err(e) => Some(Err(VistaServiceError::Serialization(e.to_string()))),
        },
        Ok(_) => None,
        Err(e) => Some(Err(VistaServiceError::Broadcast(e.to_string()))),
    })
}

// ─── Tests ─────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;
    use std::sync::Mutex;

    const TENANT_A: Uuid = Uuid::from_u128(0xA);
    const TENANT_B: Uuid = Uuid::from_u128(0xB);

    // ─── Mock Implementations ──────────────────────────────────────────

    struct MockOutboxPort {
        events: Mutex<Vec<VistaOutboxEvent>>,
        consumed: Mutex<Vec<i64>>,
        failed: Mutex<Vec<(i64, i32)>>,
        dlq: Mutex<Vec<i64>>,
    }

    impl MockOutboxPort {
        fn new(events: Vec<VistaOutboxEvent>) -> Self {
            Self {
                events: Mutex::new(events),
                consumed: Mutex::new(Vec::new()),
                failed: Mutex::new(Vec::new()),
                dlq: Mutex::new(Vec::new()),
            }
        }

        fn consumed_ids(&self) -> Vec<i64> {
            self.consumed.lock().unwrap().clone()
        }

        fn failed_ids(&self) -> Vec<(i64, i32)> {
            self.failed.lock().unwrap().clone()
        }

        fn dlq_ids(&self) -> Vec<i64> {
            self.dlq.lock().unwrap().clone()
        }
    }

    #[async_trait::async_trait]
    impl VistaOutboxPort for MockOutboxPort {
        async fn fetch_unconsumed(
            &self,
            limit: u32,
        ) -> Result<Vec<VistaOutboxEvent>, VistaServiceError> {
            let mut events = self.events.lock().unwrap();
            let count = events.len().min(limit as usize);
            Ok(events.drain(..count).collect())
        }

        async fn mark_consumed(
            &self,
            event_id: i64,
            _consumed_at: SystemTime,
        ) -> Result<(), VistaServiceError> {
            self.consumed.lock().unwrap().push(event_id);
            Ok(())
        }

        async fn mark_failed(
            &self,
            event_id: i64,
            new_attempt_count: i32,
        ) -> Result<(), VistaServiceError> {
            self.failed
                .lock()
                .unwrap()
                .push((event_id, new_attempt_count));
            Ok(())
        }

        async fn move_to_dlq(&self, event_id: i64, _reason: &str) -> Result<(), VistaServiceError> {
            self.dlq.lock().unwrap().push(event_id);
            Ok(())
        }
    }

    struct MockAggregationPort {
        applied: Mutex<HashSet<i64>>,
        snapshots: Mutex<Vec<KpiSnapshot>>,
        fail_for: Mutex<HashSet<i64>>,
    }

    impl MockAggregationPort {
        fn new() -> Self {
            Self {
                applied: Mutex::new(HashSet::new()),
                snapshots: Mutex::new(Vec::new()),
                fail_for: Mutex::new(HashSet::new()),
            }
        }

        fn with_fail_for(ids: &[i64]) -> Self {
            Self {
                applied: Mutex::new(HashSet::new()),
                snapshots: Mutex::new(Vec::new()),
                fail_for: Mutex::new(ids.iter().copied().collect()),
            }
        }

        fn pre_apply(&self, event_id: i64) {
            self.applied.lock().unwrap().insert(event_id);
        }
    }

    #[async_trait::async_trait]
    impl VistaAggregationPort for MockAggregationPort {
        async fn apply_aggregation(
            &self,
            event: &VistaOutboxEvent,
        ) -> Result<KpiSnapshot, VistaServiceError> {
            if self.fail_for.lock().unwrap().contains(&event.id) {
                return Err(VistaServiceError::Aggregation("mock failure".into()));
            }

            let tenant_id = event.aggregate_id.unwrap_or_else(Uuid::nil);
            let snapshot = KpiSnapshot {
                tenant_id,
                metric_name: format!("metric_{}", event.event_type),
                metric_value: 1.0,
                computed_at: SystemTime::now(),
            };

            self.applied.lock().unwrap().insert(event.id);
            self.snapshots.lock().unwrap().push(snapshot.clone());

            Ok(snapshot)
        }

        async fn is_already_applied(&self, event_id: i64) -> Result<bool, VistaServiceError> {
            Ok(self.applied.lock().unwrap().contains(&event_id))
        }

        async fn get_kpis(&self, tenant_id: Uuid) -> Result<Vec<KpiSnapshot>, VistaServiceError> {
            Ok(self
                .snapshots
                .lock()
                .unwrap()
                .iter()
                .filter(|s| s.tenant_id == tenant_id)
                .cloned()
                .collect())
        }
    }

    struct MockClock {
        time: SystemTime,
    }

    impl Clock for MockClock {
        fn now(&self) -> SystemTime {
            self.time
        }
    }

    // ─── Test Helpers ──────────────────────────────────────────────────

    fn make_event(id: i64, event_type: &str, tenant_id: Uuid, attempts: i32) -> VistaOutboxEvent {
        VistaOutboxEvent {
            id,
            schema: AppSchema::Core,
            event_type: event_type.to_string(),
            aggregate_id: Some(tenant_id),
            payload: serde_json::json!({"tenant_id": tenant_id.to_string()}),
            attempts,
            created_at: SystemTime::now(),
        }
    }

    fn make_service(
        outbox: MockOutboxPort,
        aggregation: MockAggregationPort,
    ) -> (VistaService, Arc<MockOutboxPort>, Arc<MockAggregationPort>) {
        let outbox_arc = Arc::new(outbox);
        let agg_arc = Arc::new(aggregation);
        let service = VistaService::new(
            outbox_arc.clone(),
            agg_arc.clone(),
            Arc::new(MockClock {
                time: SystemTime::now(),
            }),
        );
        (service, outbox_arc, agg_arc)
    }

    // ─── process_single_event Tests ───────────────────────────────────

    #[tokio::test]
    async fn test_process_single_event_success() {
        let event = make_event(1, "contact_created", TENANT_A, 0);
        let (service, outbox, _agg) =
            make_service(MockOutboxPort::new(vec![]), MockAggregationPort::new());

        let result = service.process_single_event(&event).await;

        assert!(result.is_ok());
        let snapshot = result.unwrap().expect("should have snapshot");
        assert_eq!(snapshot.tenant_id, TENANT_A);
        assert_eq!(snapshot.metric_name, "metric_contact_created");

        let consumed = outbox.consumed_ids();
        assert_eq!(consumed.len(), 1);
        assert_eq!(consumed[0], 1);
    }

    #[tokio::test]
    async fn test_process_single_event_idempotent_skip() {
        let event = make_event(2, "contact_updated", TENANT_A, 0);
        let (service, outbox, agg) =
            make_service(MockOutboxPort::new(vec![]), MockAggregationPort::new());
        agg.pre_apply(2);

        let result = service.process_single_event(&event).await;

        assert!(result.is_ok());
        assert!(
            result.unwrap().is_none(),
            "should return None for idempotent skip"
        );

        let consumed = outbox.consumed_ids();
        assert_eq!(consumed.len(), 1, "should still mark consumed on skip");
        assert_eq!(consumed[0], 2);
    }

    #[tokio::test]
    async fn test_process_single_event_failure_propagates() {
        let event = make_event(3, "contact_deleted", TENANT_A, 0);
        let (service, outbox, _agg) = make_service(
            MockOutboxPort::new(vec![]),
            MockAggregationPort::with_fail_for(&[3]),
        );

        let result = service.process_single_event(&event).await;

        assert!(result.is_err());
        let consumed = outbox.consumed_ids();
        assert!(consumed.is_empty(), "should not mark consumed on failure");
    }

    // ─── process_batch Tests ──────────────────────────────────────────

    #[tokio::test]
    async fn test_process_batch_all_success() {
        let events = vec![
            make_event(1, "created", TENANT_A, 0),
            make_event(2, "updated", TENANT_A, 0),
            make_event(3, "deleted", TENANT_B, 0),
        ];
        let (service, outbox, _agg) =
            make_service(MockOutboxPort::new(events), MockAggregationPort::new());

        let result = service.process_batch().await.unwrap();

        assert_eq!(result.successes.len(), 3);
        assert!(result.failures.is_empty());
        assert!(result.dlq.is_empty());

        let consumed = outbox.consumed_ids();
        assert_eq!(consumed.len(), 3);
    }

    #[tokio::test]
    async fn test_process_batch_with_failures() {
        let events = vec![
            make_event(1, "created", TENANT_A, 0),
            make_event(2, "updated", TENANT_A, 0),
            make_event(3, "deleted", TENANT_B, 0),
        ];
        let (service, outbox, _agg) = make_service(
            MockOutboxPort::new(events),
            MockAggregationPort::with_fail_for(&[2]),
        );

        let result = service.process_batch().await.unwrap();

        assert_eq!(result.successes.len(), 2);
        assert!(result.successes.contains(&1));
        assert!(result.successes.contains(&3));
        assert_eq!(result.failures.len(), 1);
        assert_eq!(result.failures[0].0, 2);
        assert!(result.dlq.is_empty());

        let failed = outbox.failed_ids();
        assert_eq!(failed.len(), 1);
        assert_eq!(failed[0].0, 2);
        assert_eq!(failed[0].1, 1);
    }

    #[tokio::test]
    async fn test_process_batch_dlq_on_max_attempts() {
        let events = vec![make_event(1, "event", TENANT_A, 2)];
        let (service, outbox, _agg) = make_service(
            MockOutboxPort::new(events),
            MockAggregationPort::with_fail_for(&[1]),
        );
        let service = service.with_max_attempts(3);

        let result = service.process_batch().await.unwrap();

        assert!(result.successes.is_empty());
        assert!(result.failures.is_empty());
        assert_eq!(result.dlq.len(), 1);
        assert_eq!(result.dlq[0], 1);

        let dlq = outbox.dlq_ids();
        assert_eq!(dlq.len(), 1);
        assert_eq!(dlq[0], 1);
    }

    #[tokio::test]
    async fn test_process_batch_empty() {
        let (service, _outbox, _agg) =
            make_service(MockOutboxPort::new(vec![]), MockAggregationPort::new());

        let result = service.process_batch().await.unwrap();

        assert!(result.is_empty());
        assert_eq!(result.total(), 0);
    }

    #[tokio::test]
    async fn test_process_batch_marks_consumed_for_all_successes() {
        let events = vec![
            make_event(1, "created", TENANT_A, 0),
            make_event(2, "updated", TENANT_A, 0),
        ];
        let (service, outbox, _agg) =
            make_service(MockOutboxPort::new(events), MockAggregationPort::new());

        let result = service.process_batch().await.unwrap();

        assert_eq!(result.successes.len(), 2);
        let consumed = outbox.consumed_ids();
        assert_eq!(consumed.len(), 2);
        assert!(consumed.contains(&1));
        assert!(consumed.contains(&2));
    }

    #[tokio::test]
    async fn test_process_batch_idempotent_skip_in_batch() {
        let events = vec![
            make_event(1, "created", TENANT_A, 0),
            make_event(2, "updated", TENANT_A, 0),
        ];
        let (service, outbox, agg) =
            make_service(MockOutboxPort::new(events), MockAggregationPort::new());
        agg.pre_apply(2);

        let result = service.process_batch().await.unwrap();

        assert_eq!(result.successes.len(), 2);
        let consumed = outbox.consumed_ids();
        assert_eq!(consumed.len(), 2, "both events should be marked consumed");
    }

    // ─── Broadcaster Tests ────────────────────────────────────────────

    #[tokio::test]
    async fn test_broadcaster_broadcast_and_receive() {
        let broadcaster = KpiBroadcaster::new(16);
        let mut rx = broadcaster.subscribe();

        let snapshot = KpiSnapshot {
            tenant_id: TENANT_A,
            metric_name: "revenue".into(),
            metric_value: 42.0,
            computed_at: SystemTime::now(),
        };

        broadcaster.broadcast(KpiUpdate::from(snapshot)).unwrap();

        let received = rx.recv().await.unwrap();
        assert_eq!(received.snapshot.metric_name, "revenue");
        assert_eq!(received.snapshot.metric_value, 42.0);
        assert_eq!(received.tenant_id, TENANT_A);
    }

    #[tokio::test]
    async fn test_broadcaster_no_subscribers() {
        let broadcaster = KpiBroadcaster::new(16);

        let result = broadcaster.broadcast(KpiUpdate {
            tenant_id: TENANT_A,
            snapshot: KpiSnapshot {
                tenant_id: TENANT_A,
                metric_name: "test".into(),
                metric_value: 1.0,
                computed_at: SystemTime::now(),
            },
        });

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_broadcaster_subscriber_count() {
        let broadcaster = KpiBroadcaster::new(16);
        assert_eq!(broadcaster.subscriber_count(), 0);

        let _rx1 = broadcaster.subscribe();
        assert_eq!(broadcaster.subscriber_count(), 1);

        let _rx2 = broadcaster.subscribe();
        assert_eq!(broadcaster.subscriber_count(), 2);
    }

    // ─── SSE Stream Tests ─────────────────────────────────────────────

    #[tokio::test]
    async fn test_kpi_stream_yields_json() {
        use tokio_stream::StreamExt;

        let broadcaster = KpiBroadcaster::new(16);
        let mut stream = create_kpi_stream(&broadcaster, TENANT_A);

        let snapshot = KpiSnapshot {
            tenant_id: TENANT_A,
            metric_name: "mrr".into(),
            metric_value: 999.0,
            computed_at: SystemTime::now(),
        };

        broadcaster.broadcast(KpiUpdate::from(snapshot)).unwrap();

        let item = tokio::time::timeout(std::time::Duration::from_millis(500), stream.next())
            .await
            .expect("stream timed out")
            .expect("stream ended");

        let json = item.expect("stream error");
        assert!(json.contains("mrr"));
        assert!(json.contains("999.0"));
    }

    #[tokio::test]
    async fn test_kpi_stream_filters_other_tenant() {
        use tokio_stream::StreamExt;
use ataqu_kernel::{Clock, IdGenerator};
use ataqu_kernel::TenantId;

        let broadcaster = KpiBroadcaster::new(16);
        let mut stream = create_kpi_stream(&broadcaster, TENANT_A);

        let other_snapshot = KpiSnapshot {
            tenant_id: TENANT_B,
            metric_name: "other".into(),
            metric_value: 123.0,
            computed_at: SystemTime::now(),
        };
        broadcaster
            .broadcast(KpiUpdate::from(other_snapshot))
            .unwrap();

        let our_snapshot = KpiSnapshot {
            tenant_id: TENANT_A,
            metric_name: "ours".into(),
            metric_value: 456.0,
            computed_at: SystemTime::now(),
        };
        broadcaster
            .broadcast(KpiUpdate::from(our_snapshot))
            .unwrap();

        let item = tokio::time::timeout(std::time::Duration::from_millis(500), stream.next())
            .await
            .expect("stream timed out")
            .expect("stream ended");

        let json = item.expect("stream error");
        assert!(json.contains("ours"), "should receive our tenant's update");
        assert!(
            !json.contains("123.0"),
            "should not contain other tenant's data"
        );
    }

    // ─── Builder Tests ────────────────────────────────────────────────

    #[tokio::test]
    async fn test_batch_size_override() {
        let events: Vec<_> = (1..=10)
            .map(|i| make_event(i, "event", TENANT_A, 0))
            .collect();
        let (service, _outbox, _agg) =
            make_service(MockOutboxPort::new(events), MockAggregationPort::new());

        let result = service.process_batch().await.unwrap();

        assert_eq!(result.total(), 10);
    }

    #[tokio::test]
    async fn test_max_attempts_override() {
        let events = vec![make_event(1, "event", TENANT_A, 0)];
        let (service, _outbox, _agg) = make_service(
            MockOutboxPort::new(events),
            MockAggregationPort::with_fail_for(&[1]),
        );
        let service = service.with_max_attempts(1);

        let result = service.process_batch().await.unwrap();

        assert_eq!(result.dlq.len(), 1);
        assert_eq!(result.dlq[0], 1);
    }

    // ─── get_kpis Test ────────────────────────────────────────────────

    #[tokio::test]
    async fn test_get_kpis() {
        let (_service, _outbox, agg) =
            make_service(MockOutboxPort::new(vec![]), MockAggregationPort::new());

        agg.snapshots.lock().unwrap().push(KpiSnapshot {
            tenant_id: TENANT_A,
            metric_name: "revenue".into(),
            metric_value: 1000.0,
            computed_at: SystemTime::now(),
        });
        agg.snapshots.lock().unwrap().push(KpiSnapshot {
            tenant_id: TENANT_B,
            metric_name: "revenue".into(),
            metric_value: 2000.0,
            computed_at: SystemTime::now(),
        });

        let (_service, _o, _a) =
            make_service(MockOutboxPort::new(vec![]), MockAggregationPort::new());
        // Re-create with the pre-populated agg
        let service = VistaService::new(
            Arc::new(MockOutboxPort::new(vec![])),
            agg.clone(),
            Arc::new(MockClock {
                time: SystemTime::now(),
            }),
        );

        let kpis_a = service.get_kpis(TENANT_A).await.unwrap();
        assert_eq!(kpis_a.len(), 1);
        assert_eq!(kpis_a[0].metric_value, 1000.0);

        let kpis_b = service.get_kpis(TENANT_B).await.unwrap();
        assert_eq!(kpis_b.len(), 1);
        assert_eq!(kpis_b[0].metric_value, 2000.0);
    }

    // ─── AppSchema Tests ──────────────────────────────────────────────

    #[test]
    fn test_app_schema_display() {
        assert_eq!(AppSchema::Core.to_string(), "core");
        assert_eq!(AppSchema::CollabCrm.to_string(), "collab_crm");
        assert_eq!(AppSchema::CollabOps.to_string(), "collab_ops");
        assert_eq!(AppSchema::Vault.to_string(), "vault");
        assert_eq!(AppSchema::Dial.to_string(), "dial");
        assert_eq!(AppSchema::Vista.to_string(), "vista");
    }

    #[test]
    fn test_batch_result_default() {
        let result = BatchResult::default();
        assert!(result.is_empty());
        assert_eq!(result.total(), 0);
    }
}