use ataqu_domain_health::{HealthStatus, ComponentHealth, SparkWorkflowHealth, DbPoolHealth, Components, SystemHealth, classify};
use ataqu_infra_repositories::health_repo::HealthRepository;
use ataqu_kernel::Clock;
use ataqu_infra_pools::Pools;
use chrono::{DateTime, SecondsFormat, Utc};
use std::sync::Arc;

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
