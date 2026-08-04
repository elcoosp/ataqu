use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        // Add channel_type and created_by columns to dial.channels
        conn.execute_unprepared(
            r#"
            ALTER TABLE dial.channels
            ADD COLUMN IF NOT EXISTS channel_type TEXT NOT NULL DEFAULT 'public',
            ADD COLUMN IF NOT EXISTS created_by UUID,
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
            "#,
        )
        .await?;
        // Create channel_participants table
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS dial.channel_participants (
                channel_id UUID NOT NULL,
                user_id UUID NOT NULL,
                joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (channel_id, user_id)
            );
            "#,
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS dial.channel_participants;")
            .await?;
        conn.execute_unprepared("ALTER TABLE dial.channels DROP COLUMN IF EXISTS channel_type, DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS archived_at;").await?;
        Ok(())
    }
}
