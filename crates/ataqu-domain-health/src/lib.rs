//! Domain models for system health observability (ADR-034).

use chrono::{DateTime, Utc};
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Nominal,
    Degraded,
    Critical,
}

#[derive(Debug, Clone, Serialize)]
pub struct ComponentHealth {
    pub status: HealthStatus,
    pub lag_seconds: f64,
    pub pending_events: i64,
    pub last_dispatched_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SparkWorkflowHealth {
    pub status: HealthStatus,
    pub total: i64,
    pub failed_last_hour: i64,
    pub dlq_depth: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DbPoolHealth {
    pub used: i64,
    pub max: i64,
    pub waiting: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct Components {
    pub outbox: ComponentHealth,
    pub spark_workflows: SparkWorkflowHealth,
    pub db_connection_pools: DbPoolHealth,
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemHealth {
    pub status: HealthStatus,
    pub timestamp: DateTime<Utc>,
    pub components: Components,
}

/// Pure function to classify health based on outbox metrics.
pub fn classify_outbox(lag_seconds: f64, pending_events: i64) -> HealthStatus {
    const DEGRADED_LAG: f64 = 5.0;
    const CRITICAL_LAG: f64 = 30.0;
    const DEGRADED_PENDING: i64 = 1_000;
    const CRITICAL_PENDING: i64 = 10_000;

    if lag_seconds > CRITICAL_LAG || pending_events > CRITICAL_PENDING {
        HealthStatus::Critical
    } else if lag_seconds > DEGRADED_LAG || pending_events > DEGRADED_PENDING {
        HealthStatus::Degraded
    } else {
        HealthStatus::Nominal
    }
}
