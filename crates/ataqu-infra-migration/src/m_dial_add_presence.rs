use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS dial.presence (
                tenant_id UUID NOT NULL,
                user_id UUID NOT NULL,
                status TEXT NOT NULL,
                last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (tenant_id, user_id)
            );
            "#,
        ).await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON dial.presence (last_seen);",
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS dial.presence;").await?;
        Ok(())
    }
}
