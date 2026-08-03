use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS dial.threads (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                channel_id UUID NOT NULL,
                parent_message_id UUID NOT NULL,
                created_at TIMESTAMPTZ NOT NULL
            );
            "#,
        ).await?;
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS dial.mentions (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                message_id UUID NOT NULL,
                user_id UUID NOT NULL,
                read_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL
            );
            "#,
        ).await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_threads_channel ON dial.threads (channel_id);",
        ).await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_mentions_user ON dial.mentions (user_id);",
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS dial.mentions;").await?;
        conn.execute_unprepared("DROP TABLE IF EXISTS dial.threads;").await?;
        Ok(())
    }
}
