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
            ADD COLUMN IF NOT EXISTS event_type_id UUID,
            ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.bookings
            DROP COLUMN IF EXISTS event_type_id,
            DROP COLUMN IF EXISTS status;
            "#
        ).await?;
        Ok(())
    }
}
