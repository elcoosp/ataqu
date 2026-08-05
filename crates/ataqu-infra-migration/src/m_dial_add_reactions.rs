use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS dial.reactions (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                message_id UUID NOT NULL,
                user_id UUID NOT NULL,
                emoji TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_reactions_message ON dial.reactions (message_id);
            "#,
        ).await?;
        Ok(())
    }
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS dial.reactions;").await?;
        Ok(())
    }
}
