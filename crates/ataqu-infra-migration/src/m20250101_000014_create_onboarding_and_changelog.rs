use sea_orm::Statement;
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000014_create_onboarding_and_changelog"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS core.onboarding_progress (
                tenant_id UUID PRIMARY KEY,
                tasks_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
                last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#
            .to_owned(),
        ))
        .await?;

        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS core.changelog (
                id BIGSERIAL PRIMARY KEY,
                version TEXT NOT NULL,
                date DATE NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL CHECK (category IN ('new', 'improved', 'fixed', 'deprecated')),
                breaking_change BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#
            .to_owned(),
        ))
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "DROP TABLE IF EXISTS core.changelog;".to_owned(),
        ))
        .await?;
        db.execute_raw(Statement::from_string(
            db.get_database_backend(),
            "DROP TABLE IF EXISTS core.onboarding_progress;".to_owned(),
        ))
        .await?;
        Ok(())
    }
}
