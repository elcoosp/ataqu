use async_trait::async_trait;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};

#[async_trait]
pub trait SsoStateStore: Send + Sync {
    async fn insert(&self, state: String, payload: String, ttl_secs: u64) -> Result<(), String>;
    async fn take(&self, state: &str) -> Result<Option<String>, String>;
}

pub struct PostgresSsoStateStore {
    db: DatabaseConnection,
}

impl PostgresSsoStateStore {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl SsoStateStore for PostgresSsoStateStore {
    async fn insert(&self, state: String, payload: String, ttl_secs: u64) -> Result<(), String> {
        let sql = r#"
            INSERT INTO core.sso_states (state, payload, expires_at)
            VALUES ($1, $2, NOW() + make_interval(secs => $3::int))
        "#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![state.into(), payload.into(), (ttl_secs as i64).into()],
        );
        self.db.execute_raw(stmt).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn take(&self, state: &str) -> Result<Option<String>, String> {
        let sql = r#"
            DELETE FROM core.sso_states
            WHERE state = $1 AND expires_at > NOW()
            RETURNING payload
        "#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![state.into()],
        );
        let row = self
            .db
            .query_one_raw(stmt)
            .await
            .map_err(|e| e.to_string())?;
        match row {
            Some(r) => {
                let payload: String = r.try_get("", "payload").map_err(|e| e.to_string())?;
                Ok(Some(payload))
            }
            None => Ok(None),
        }
    }
}
