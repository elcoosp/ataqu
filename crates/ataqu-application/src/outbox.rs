use async_trait::async_trait;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use uuid::Uuid;

#[async_trait]
pub trait Outbox: Send + Sync {
    async fn append(
        &self,
        schema: &str,
        event_type: &str,
        aggregate_id: Uuid,
        payload: &serde_json::Value,
    ) -> Result<(), String>;
}

pub struct SeaOrmOutbox {
    db: DatabaseConnection,
}

impl SeaOrmOutbox {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl Outbox for SeaOrmOutbox {
    async fn append(
        &self,
        schema: &str,
        event_type: &str,
        aggregate_id: Uuid,
        payload: &serde_json::Value,
    ) -> Result<(), String> {
        let sql = r#"
            INSERT INTO core.outbox (schema, event_type, aggregate_id, payload, status, priority)
            VALUES ($1::app_schema, $2, $3, $4, 'pending', 'normal')
        "#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![
                schema.into(),
                event_type.into(),
                aggregate_id.into(),
                payload.clone().into(),
            ],
        );
        self.db.execute_raw(stmt).await.map_err(|e| e.to_string())?;

        self.db.execute_raw(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT pg_notify('outbox_event', '')",
            vec![],
        ))
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }
}
