use chrono::{DateTime, NaiveDate, Utc};
use sea_orm::{DatabaseConnection, DbBackend, DbErr, FromQueryResult, Statement};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, FromQueryResult)]
pub struct ChangelogEntry {
    pub id: i64,
    pub version: String,
    pub date: NaiveDate,
    pub title: String,
    pub description: String,
    pub category: String,
    pub breaking_change: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct ChangelogService {
    db: DatabaseConnection,
}

impl ChangelogService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn list_entries(&self, limit: i64) -> Result<Vec<ChangelogEntry>, DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT id, version, date, title, description, category, breaking_change, created_at FROM core.changelog ORDER BY date DESC, id DESC LIMIT $1",
            [limit.into()],
        );

        ChangelogEntry::find_by_statement(stmt).all(&self.db).await
    }
}
