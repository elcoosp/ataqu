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
