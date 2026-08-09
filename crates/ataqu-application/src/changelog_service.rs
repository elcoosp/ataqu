use chrono::{DateTime, NaiveDate, Utc};
use sea_orm::{DatabaseConnection, DbBackend, DbErr, FromQueryResult, Statement};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use ataqu_infra_repositories::user_preferences_repo::UserPreferencesRepository;

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
                let prefs_repo = UserPreferencesRepository::new(self.db.clone());
        let last_read = prefs_repo.get_last_read_changelog(user_id).await.unwrap_or(None);
        let cutoff = last_read.unwrap_or(chrono::DateTime::from_timestamp(0, 0).unwrap());
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT c.id, c.version, c.date, c.title, c.description, c.category, c.breaking_change, c.created_at
             FROM core.changelog c
             WHERE c.created_at > $1
             ORDER BY c.date DESC, c.id DESC LIMIT $2",
            [cutoff.into(), limit.into()],
        );

        ChangelogEntry::find_by_statement(stmt).all(&self.db).await
    }

    pub async fn mark_read(&self, user_id: Uuid) -> Result<(), DbErr> {
                let prefs_repo = UserPreferencesRepository::new(self.db.clone());
        let now = Utc::now();
        prefs_repo.update_last_read_changelog(user_id, now).await.map_err(|e| DbErr::Custom(e.to_string()))?;
        Ok(())
    }

}