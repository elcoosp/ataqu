use chrono::{DateTime, NaiveDate, Utc};
use sea_orm::{DatabaseConnection, DbBackend, DbErr, FromQueryResult, Statement};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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

    pub async fn list_unread_entries(
        &self,
        user_id: Uuid,
        limit: i64,
    ) -> Result<Vec<ChangelogEntry>, DbErr> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT c.id, c.version, c.date, c.title, c.description, c.category, c.breaking_change, c.created_at
             FROM core.changelog c
             JOIN core.users u ON u.id = $1
             WHERE c.created_at > u.last_login_at
             ORDER BY c.date DESC, c.id DESC LIMIT $2",
            [user_id.into(), limit.into()],
        );

        ChangelogEntry::find_by_statement(stmt).all(&self.db).await
    }
}
