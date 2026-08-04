use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.bookings
            ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
            ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
            "#,
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.bookings
            DROP COLUMN IF EXISTS timezone,
            DROP COLUMN IF EXISTS reminder_sent_at;
            "#,
        )
        .await?;
        Ok(())
    }
}
