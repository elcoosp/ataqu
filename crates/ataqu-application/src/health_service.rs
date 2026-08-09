use ataqu_infra_repositories::health_repo::HealthRepository;
use ataqu_kernel::Clock;
use chrono::{DateTime, SecondsFormat, Utc};
use serde::Serialize;
use std::sync::Arc;

const DEGRADED_LAG_SECONDS: f64 = 5.0;
const CRITICAL_LAG_SECONDS: f64 = 30.0;
const DEGRADED_PENDING_EVENTS: i64 = 1_000;
const CRITICAL_PENDING_EVENTS: i64 = 10_000;

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
    pub last_dispatched_at: Option<String>,
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
    pub timestamp: String,
    pub components: Components,
}

fn classify(lag_seconds: f64, pending_events: i64) -> HealthStatus {
    if lag_seconds > CRITICAL_LAG_SECONDS || pending_events > CRITICAL_PENDING_EVENTS {
        HealthStatus::Critical
    } else if lag_seconds > DEGRADED_LAG_SECONDS || pending_events > DEGRADED_PENDING_EVENTS {
        HealthStatus::Degraded
    } else {
        HealthStatus::Nominal
    }
}

pub struct HealthService {
    repo: Arc<HealthRepository>,
    clock: Arc<dyn Clock + Send + Sync>,
}

impl HealthService {
    pub fn new(repo: Arc<HealthRepository>, clock: Arc<dyn Clock + Send + Sync>) -> Self {
        Self { repo, clock }
    }

    pub async fn get_system_health(&self) -> Result<SystemHealth, String> {
        let lag_seconds = self
            .repo
            .get_outbox_lag_seconds()
            .await
            .map_err(|e| e.to_string())?;
        let pending_events = self
            .repo
            .get_pending_outbox_count()
            .await
            .map_err(|e| e.to_string())?;

        let outbox_status = classify(lag_seconds, pending_events);
        let now: DateTime<Utc> = self.clock.now().into();

        Ok(SystemHealth {
            status: outbox_status,
            timestamp: now.to_rfc3339_opts(SecondsFormat::Secs, true),
            components: Components {
                outbox: ComponentHealth {
                    status: outbox_status,
                    lag_seconds,
                    pending_events,
                    last_dispatched_at: None,
                },
                spark_workflows: SparkWorkflowHealth {
                    status: HealthStatus::Nominal,
                    total: self.repo.get_total_workflows().await.unwrap_or(0),
                    failed_last_hour: self
                        .repo
                        .get_failed_workflows_last_hour()
                        .await
                        .unwrap_or(0),
                    dlq_depth: self.repo.get_workflow_dlq_depth().await.unwrap_or(0),
                },
                db_connection_pools: DbPoolHealth {
                    used: self.repo.get_db_pool_used().await.unwrap_or(0),
                    max: 35,
                    waiting: self.repo.get_db_pool_waiting().await.unwrap_or(0),
                },
            },
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_nominal_when_fresh() {
        assert_eq!(classify(0.2, 0), HealthStatus::Nominal);
    }

    #[test]
    fn classify_nominal_at_degraded_boundaries() {
        assert_eq!(
            classify(DEGRADED_LAG_SECONDS, DEGRADED_PENDING_EVENTS),
            HealthStatus::Nominal
        );
    }

    #[test]
    fn classify_degraded_when_lag_exceeds_five_seconds() {
        assert_eq!(classify(5.1, 0), HealthStatus::Degraded);
    }

    #[test]
    fn classify_degraded_when_pending_exceeds_one_thousand() {
        assert_eq!(classify(0.0, 1_001), HealthStatus::Degraded);
    }

    #[test]
    fn classify_critical_when_lag_exceeds_thirty_seconds() {
        assert_eq!(classify(30.1, 0), HealthStatus::Critical);
    }

    #[test]
    fn classify_critical_when_pending_exceeds_ten_thousand() {
        assert_eq!(classify(0.0, 10_001), HealthStatus::Critical);
    }

    #[test]
    fn classify_critical_takes_precedence() {
        assert_eq!(classify(31.0, 20_000), HealthStatus::Critical);
    }
}
