use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// Adds per-employee onboarding tracking to PAUSE (spec: onboarding honesty fix).
/// - `onboarding_tasks`: JSONB array of completed task ids (e.g. ["paperwork"]).
/// - `onboarding_completed_at`: set when every task is done.
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.employee
            ADD COLUMN IF NOT EXISTS onboarding_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
            "#,
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.employee
            DROP COLUMN IF EXISTS onboarding_completed_at,
            DROP COLUMN IF EXISTS onboarding_tasks;
            "#,
        )
        .await?;
        Ok(())
    }
}
