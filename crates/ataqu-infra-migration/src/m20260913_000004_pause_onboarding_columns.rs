use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// Adds per-employee onboarding tracking to PAUSE (spec: onboarding honesty fix).
/// - `onboarding_tasks`: JSONB array of completed task ids (e.g. ["paperwork"]).
/// - `onboarding_completed_at`: set when every task is done.
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("employees"))
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("onboarding_tasks"))
                            .json_binary()
                            .not_null()
                            .default("[]"),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("onboarding_completed_at"))
                            .timestamp_with_time_zone(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.employees
            DROP COLUMN IF EXISTS onboarding_completed_at,
            DROP COLUMN IF EXISTS onboarding_tasks;
            "#,
        )
        .await?;
        Ok(())
    }
}
