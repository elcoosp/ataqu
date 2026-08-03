//! VISTA analytics service – outbox event processor and KPI broadcaster.

use std::sync::Arc;
use uuid::Uuid;
use serde_json::Value;

use ataqu_kernel::{Clock, TenantId};

#[derive(Debug, Clone)]
pub struct KpiSnapshot {
    pub tenant_id: TenantId,
    pub metric_name: String,
    pub metric_value: f64,
    pub computed_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct OutboxEvent {
    pub id: i64,
    pub schema: String,
    pub event_type: String,
    pub aggregate_id: Uuid,
    pub payload: Value,
}

pub trait OutboxReader: Send + Sync {
    fn fetch_unconsumed(&self, limit: u32) -> Result<Vec<OutboxEvent>, String>;
    fn mark_consumed(&self, event_id: i64) -> Result<(), String>;
}

pub trait KpiStore: Send + Sync {
    fn save_snapshot(&self, snapshot: KpiSnapshot) -> Result<(), String>;
    fn get_snapshots(&self, tenant_id: TenantId) -> Result<Vec<KpiSnapshot>, String>;
}

// In-memory implementations
#[derive(Default)]
pub struct InMemoryOutbox {
    events: Arc<std::sync::RwLock<Vec<OutboxEvent>>>,
    consumed: Arc<std::sync::RwLock<Vec<i64>>>,
}
impl OutboxReader for InMemoryOutbox {
    fn fetch_unconsumed(&self, limit: u32) -> Result<Vec<OutboxEvent>, String> {
        let all = self.events.read().unwrap();
        let consumed = self.consumed.read().unwrap();
        let unconsumed: Vec<_> = all.iter().filter(|e| !consumed.contains(&e.id)).take(limit as usize).cloned().collect();
        Ok(unconsumed)
    }
    fn mark_consumed(&self, event_id: i64) -> Result<(), String> {
        self.consumed.write().unwrap().push(event_id);
        Ok(())
    }
}

#[derive(Default)]
pub struct InMemoryKpiStore {
    snapshots: Arc<std::sync::RwLock<Vec<KpiSnapshot>>>,
}
impl KpiStore for InMemoryKpiStore {
    fn save_snapshot(&self, snapshot: KpiSnapshot) -> Result<(), String> {
        self.snapshots.write().unwrap().push(snapshot);
        Ok(())
    }
    fn get_snapshots(&self, tenant_id: TenantId) -> Result<Vec<KpiSnapshot>, String> {
        let all = self.snapshots.read().unwrap();
        let filtered = all.iter().filter(|s| s.tenant_id == tenant_id).cloned().collect();
        Ok(filtered)
    }
}

pub struct VistaService {
    outbox: Arc<dyn OutboxReader>,
    kpi_store: Arc<dyn KpiStore>,
    clock: Arc<dyn Clock>,
}

impl VistaService {
    pub fn new(
        outbox: Arc<dyn OutboxReader>,
        kpi_store: Arc<dyn KpiStore>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self { outbox, kpi_store, clock }
    }

    pub async fn process_batch(&self) -> Result<usize, String> {
        let events = self.outbox.fetch_unconsumed(10)?;
        let mut processed = 0;
        for event in events {
            // Aggregate logic: for simplicity, just count events per tenant
            let tenant_id = TenantId::new(event.aggregate_id); // In real, extract from payload
            let snapshot = KpiSnapshot {
                tenant_id,
                metric_name: "event_count".to_string(),
                metric_value: 1.0,
                computed_at: self.clock.now().into(),
            };
            self.kpi_store.save_snapshot(snapshot)?;
            self.outbox.mark_consumed(event.id)?;
            processed += 1;
        }
        Ok(processed)
    }

    pub async fn get_kpis(&self, tenant_id: TenantId) -> Result<Vec<KpiSnapshot>, String> {
        self.kpi_store.get_snapshots(tenant_id)
    }
}
