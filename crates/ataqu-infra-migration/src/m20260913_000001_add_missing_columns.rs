use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            r#"
            ALTER TABLE core.users
              ADD COLUMN IF NOT EXISTS role          TEXT    NOT NULL DEFAULT 'member',
              ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT TRUE,
              ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS version       INT     NOT NULL DEFAULT 0;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            ALTER TABLE collab_crm.workflows
              ADD COLUMN IF NOT EXISTS trigger        JSONB   NOT NULL DEFAULT '{}'::jsonb,
              ADD COLUMN IF NOT EXISTS conditions     JSONB   NOT NULL DEFAULT '[]'::jsonb,
              ADD COLUMN IF NOT EXISTS actions        JSONB   NOT NULL DEFAULT '[]'::jsonb,
              ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT TRUE,
              ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
              ADD COLUMN IF NOT EXISTS version        INT     NOT NULL DEFAULT 0;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.bookings
              ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'google';
            "#,
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            r#"
            ALTER TABLE core.users
              DROP COLUMN IF EXISTS role,
              DROP COLUMN IF EXISTS is_active,
              DROP COLUMN IF EXISTS last_login_at,
              DROP COLUMN IF EXISTS version;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            ALTER TABLE collab_crm.workflows
              DROP COLUMN IF EXISTS trigger,
              DROP COLUMN IF EXISTS conditions,
              DROP COLUMN IF EXISTS actions,
              DROP COLUMN IF EXISTS is_active,
              DROP COLUMN IF EXISTS webhook_secret,
              DROP COLUMN IF EXISTS version;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.bookings
              DROP COLUMN IF EXISTS provider;
            "#,
        )
        .await?;

        Ok(())
    }
}
