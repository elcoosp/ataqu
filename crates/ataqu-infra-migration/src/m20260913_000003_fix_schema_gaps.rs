use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // collab_ops.bookings: the entity `booking_entity` (ataqu-infra-repositories
        // /src/tempo_repo_impl.rs) selects `reminder_sent` and `version`, but neither
        // column was ever created by earlier migrations (which only added
        // `reminder_sent_at TIMESTAMPTZ`). Add the missing columns.
        db.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.bookings
              ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
              ADD COLUMN IF NOT EXISTS version       INT     NOT NULL DEFAULT 0;
            "#,
        )
        .await?;

        // core.users: SSO users (created by `sso_exchange_with_tenant_resolution`)
        // have no password, but the column was declared NOT NULL. Drop NOT NULL
        // so passwordless (SSO-only) users can be persisted.
        db.execute_unprepared(
            r#"
            ALTER TABLE core.users
              ALTER COLUMN password_hash DROP NOT NULL;
            "#,
        )
        .await?;

        // collab_crm.workflows: rows created before the trigger/conditions/actions
        // columns were added carry the default `'{}'::jsonb` for `trigger`. The
        // `Trigger` enum (ataqu-domain-spark/src/trigger.rs) is an externally
        // tagged enum, so `{}` fails serde with "invalid value: map, expected
        // map with a single key" and crashes the SPARK cron poller. Backfill
        // any empty/NULL triggers with a valid, inert variant.
        db.execute_unprepared(
            r#"
            UPDATE collab_crm.workflows
            SET trigger = '{"Event":{"event_type":"__disabled__"}}'::jsonb
            WHERE trigger = '{}'::jsonb OR trigger IS NULL;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            UPDATE collab_crm.workflows
            SET conditions = '[]'::jsonb
            WHERE conditions IS NULL;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            UPDATE collab_crm.workflows
            SET actions = '[]'::jsonb
            WHERE actions IS NULL;
            "#,
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            "ALTER TABLE collab_ops.bookings \
               DROP COLUMN IF EXISTS reminder_sent, \
               DROP COLUMN IF EXISTS version;",
        )
        .await?;

        // Restoring NOT NULL on password_hash is unsafe if SSO rows exist;
        // deliberately left as-is on downgrade.

        Ok(())
    }
}
