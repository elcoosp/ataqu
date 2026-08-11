#![allow(unused_variables)]
use chrono::{DateTime, Utc};
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, DbErr, FromQueryResult, Statement};
// serde not needed
use std::sync::Arc;
use uuid::Uuid;

use crate::outbox::Outbox;
use ataqu_domain_onboarding::{OnboardingStatus, calculate_progress};

#[derive(Clone)]
pub struct OnboardingService {
    db: DatabaseConnection,
    outbox: Arc<dyn Outbox + Send + Sync>,
}

impl OnboardingService {
    pub fn new(db: DatabaseConnection, outbox: Arc<dyn Outbox + Send + Sync>) -> Self {
        Self { db, outbox }
    }

    pub async fn get_status(&self, tenant_id: Uuid) -> Result<OnboardingStatus, DbErr> {
        #[derive(FromQueryResult)]
        struct Row {
            tasks_completed: serde_json::Value,
            last_active_at: DateTime<Utc>,
        }

        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT tasks_completed, last_active_at FROM core.onboarding_progress WHERE tenant_id = $1",
            [tenant_id.into()],
        );

        let row = Row::find_by_statement(stmt).one(&self.db).await?;

        let (tasks, last_active) = match row {
            Some(r) => {
                let tasks: Vec<String> =
                    serde_json::from_value(r.tasks_completed).unwrap_or_default();
                (tasks, r.last_active_at)
            }
            None => {
                let init_stmt = Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    "INSERT INTO core.onboarding_progress (tenant_id, tasks_completed, last_active_at, created_at) VALUES ($1, '[]'::jsonb, NOW(), NOW()) ON CONFLICT (tenant_id) DO NOTHING",
                    [tenant_id.into()],
                );
                self.db.execute_raw(init_stmt).await?;
                (vec![], Utc::now())
            }
        };

        let progress_percentage = calculate_progress(&tasks);

        Ok(OnboardingStatus {
            tenant_id,
            tasks_completed: tasks,
            last_active_at: last_active,
            progress_percentage,
        })
    }

    pub async fn check_inactivity(&self) -> Result<(), DbErr> {
        // Outbox is already in scope via the import
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT tenant_id, last_active_at FROM core.onboarding_progress WHERE last_active_at < NOW() - INTERVAL '7 days'",
            [],
        );
        let rows = self.db.query_all_raw(stmt).await?;
        for row in rows {
            let tenant_id: Uuid = row.try_get("", "tenant_id").unwrap_or_default();
            let last_active_at: chrono::DateTime<chrono::Utc> = row
                .try_get("", "last_active_at")
                .unwrap_or(chrono::Utc::now());
            let payload = serde_json::json!({
                "tenant_id": tenant_id,
                "days_inactive": 7,
                "last_active_at": last_active_at,
            });
            if let Err(e) = self
                .outbox
                .append("core", "InactivityReminder", tenant_id, &payload)
                .await
            {
                tracing::error!(error = %e, "Failed to emit InactivityReminder event");
            }
        }
        Ok(())
    }

    pub async fn complete_task(
        &self,
        tenant_id: Uuid,
        task_id: String,
    ) -> Result<OnboardingStatus, DbErr> {
        let current = self.get_status(tenant_id).await?;
        let mut tasks = current.tasks_completed.clone();
        if !tasks.contains(&task_id) {
            tasks.push(task_id);
            let json_val = serde_json::to_value(&tasks).unwrap();
            let stmt = Statement::from_sql_and_values(
                DbBackend::Postgres,
                "UPDATE core.onboarding_progress SET tasks_completed = $1, last_active_at = NOW() WHERE tenant_id = $2",
                [json_val.into(), tenant_id.into()],
            );
            self.db.execute_raw(stmt).await?;
        }
        self.get_status(tenant_id).await
    }
}
