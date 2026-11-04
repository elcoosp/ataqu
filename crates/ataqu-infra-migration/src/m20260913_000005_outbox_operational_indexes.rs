use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// Operational indexes and hygiene for the outbox/idempotency hot paths
/// (fixed in audit: the dispatcher's candidate query —
/// `WHERE status='pending' AND (locked_until IS NULL OR locked_until < NOW())`
/// — degenerated to a sequential scan because no index covered it, and
/// terminal rows (completed/dlq) were never pruned so the table grew forever).
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            CREATE INDEX IF NOT EXISTS idx_outbox_status_locked
                ON core.outbox (status, locked_until);
            CREATE INDEX IF NOT EXISTS idx_outbox_created_at
                ON core.outbox (created_at);
            CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status_scheduled_for
                ON core.scheduled_tasks (status, scheduled_for);
            CREATE INDEX IF NOT EXISTS idx_idempotency_records_created_at
                ON core.idempotency_records (created_at);
            "#,
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            DROP INDEX IF EXISTS core.idx_idempotency_records_created_at;
            DROP INDEX IF EXISTS core.idx_scheduled_tasks_status_scheduled_for;
            DROP INDEX IF EXISTS core.idx_outbox_created_at;
            DROP INDEX IF EXISTS core.idx_outbox_status_locked;
            "#,
        )
        .await?;
        Ok(())
    }
}
