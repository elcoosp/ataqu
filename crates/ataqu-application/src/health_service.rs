use ataqu_infra_repositories::health_repo::HealthRepository;
use ataqu_kernel::Clock;
use ataqu_infra_pools::Pools;
use chrono::{DateTime, SecondsFormat, Utc};
use std::sync::Arc;
pub use ataqu_domain_health::{HealthStatus, ComponentHealth, SparkWorkflowHealth, DbPoolHealth, Components, SystemHealth, classify};

// Constants moved to ataqu-domain-health

// Types moved to ataqu-domain-health

// classify is imported from ataqu-domain-health

pub struct HealthService {
    repo: Arc<HealthRepository>,
    clock: Arc<dyn Clock + Send + Sync>,
    pools: Arc<Pools>,
}

impl HealthService {
    pub fn new(repo: Arc<HealthRepository>, clock: Arc<dyn Clock + Send + Sync>, pools: Arc<Pools>) -> Self {
        Self { repo, clock, pools }
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

    use super::*;

    #[test]
    fn classify_nominal_when_fresh() {
        assert_eq!(classify(0.2, 0), HealthStatus::Nominal);
    }

    #[test]
    fn classify_nominal_at_degraded_boundaries() {
        assert_eq!(
            classify(5.0, 1000),
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

