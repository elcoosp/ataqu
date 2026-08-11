use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, DbErr, Statement};

pub struct HealthRepository {
    db: DatabaseConnection,
}

impl HealthRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_outbox_lag_seconds(&self) -> Result<f64, DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))::float8 AS lag_seconds \
             FROM core.outbox WHERE status = 'pending'",
            Vec::<sea_orm::Value>::new(),
        );
        let Some(row) = self.db.query_one_raw(stmt).await? else {
            return Ok(0.0);
        };
        Ok(row.try_get::<f64>("", "lag_seconds").unwrap_or(0.0))
    }

    pub async fn get_pending_outbox_count(&self) -> Result<i64, DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT COUNT(*) AS pending_count FROM core.outbox WHERE status = 'pending'",
            Vec::<sea_orm::Value>::new(),
        );
        let Some(row) = self.db.query_one_raw(stmt).await? else {
            return Ok(0);
        };
        Ok(row.try_get::<i64>("", "pending_count").unwrap_or(0))
    }
}

impl HealthRepository {
    pub async fn get_total_workflows(&self) -> Result<i64, sea_orm::DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT COUNT(*) FROM collab_crm.workflows",
            [],
        );
        let result = self.db.query_one_raw(stmt).await?;
        Ok(result
            .and_then(|r| r.try_get_by_index::<i64>(0).ok())
            .unwrap_or(0))
    }

    pub async fn get_failed_workflows_last_hour(&self) -> Result<i64, sea_orm::DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT COUNT(*) FROM collab_crm.workflow_runs WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '1 hour'",
            [],
        );
        let result = self.db.query_one_raw(stmt).await?;
        Ok(result
            .and_then(|r| r.try_get_by_index::<i64>(0).ok())
            .unwrap_or(0))
    }

    pub async fn get_workflow_dlq_depth(&self) -> Result<i64, sea_orm::DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT COUNT(*) FROM collab_crm.workflow_runs WHERE status = 'dlq'",
            [],
        );
        let result = self.db.query_one_raw(stmt).await?;
        Ok(result
            .and_then(|r| r.try_get_by_index::<i64>(0).ok())
            .unwrap_or(0))
    }
}
