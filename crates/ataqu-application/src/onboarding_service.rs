use chrono::{DateTime, Utc};
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, DbErr, FromQueryResult, Statement};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardingStatus {
    pub tenant_id: Uuid,
    pub tasks_completed: Vec<String>,
    pub last_active_at: DateTime<Utc>,
    pub progress_percentage: f32,
}

#[derive(Clone)]
pub struct OnboardingService {
    db: DatabaseConnection,
}

impl OnboardingService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
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

        let total_tasks = 5;
        let progress_percentage = (tasks.len() as f32 / total_tasks as f32) * 100.0;

        Ok(OnboardingStatus {
            tenant_id,
            tasks_completed: tasks,
            last_active_at: last_active,
            progress_percentage,
        })
    }

    pub async fn check_inactivity(&self) -> Result<(), DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT tenant_id FROM core.onboarding_progress WHERE last_active_at < NOW() - INTERVAL '7 days'",
            [],
        );
        let rows = self.db.query_all_raw(stmt).await?;
        for row in rows {
            let tenant_id: Uuid = row.try_get("", "tenant_id").unwrap_or_default();
            tracing::info!(tenant_id = %tenant_id, "Tenant inactive for 7 days");
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
