use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        // Create channels table
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS dial.channels (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                name TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#
        )
        .await?;

        // Create messages table
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS dial.messages (
                id UUID PRIMARY KEY,
                channel_id UUID NOT NULL REFERENCES dial.channels(id) ON DELETE CASCADE,
                tenant_id UUID NOT NULL,
                sender_id UUID NOT NULL,
                content TEXT NOT NULL,
                sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            "#
        )
        .await?;

        // Create indexes
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_channels_tenant ON dial.channels (tenant_id)",
        )
        .await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_messages_tenant_channel ON dial.messages (tenant_id, channel_id)",
        )
        .await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON dial.messages (sent_at)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS dial.messages")
            .await?;
        conn.execute_unprepared("DROP TABLE IF EXISTS dial.channels")
            .await?;
        Ok(())
    }
}
