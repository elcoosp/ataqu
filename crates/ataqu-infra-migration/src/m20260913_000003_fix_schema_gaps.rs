use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Earlier deployments already ran this file before it grew these repair
        // blocks, so the migration name is recorded while the fixes are missing
        // on that database. Every statement below is idempotent, so re-run them
        // for the recorded deployment before continuing.
        db.execute_unprepared("CREATE SCHEMA IF NOT EXISTS vista;")
            .await?;
        db.execute_unprepared("DROP TABLE IF EXISTS core.dashboards CASCADE;")
            .await?;
        db.execute_unprepared("DROP TABLE IF EXISTS core.aggregated_views CASCADE;")
            .await?;
        db.execute_unprepared("DROP TABLE IF EXISTS core.analytics_data_points CASCADE;")
            .await?;

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

        // collab_ops tables: the entity models in
        // `crates/ataqu-infra-repositories/src/pause_repo_impl.rs` query
        // `collab_ops.employees` and `collab_ops.leave_requests` (plural),
        // but the original `m_pause` migration created them as singular
        // `collab_ops.employee` / `collab_ops.leave_request`. Rename so the
        // SeaORM entity models resolve.
        db.execute_unprepared(
            r#"
            ALTER TABLE IF EXISTS collab_ops.employee
              RENAME TO employees;
            ALTER TABLE IF EXISTS collab_ops.leave_request
              RENAME TO leave_requests;
            "#,
        )
        .await?;

        // collab_ops.employees / leave_requests: the SeaORM entity models in
        // pause_repo_impl.rs declare a `version` column (i32, NOT NULL DEFAULT 1)
        // plus `onboarding_tasks` (JSONB) and `onboarding_completed_at` (TIMESTAMPTZ)
        // for employees, all of which the original migrations never declared.
        db.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.employees
                ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
                ADD COLUMN IF NOT EXISTS onboarding_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
            ALTER TABLE collab_ops.leave_requests
                ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
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

        // vista schema drift: several tables were created under `core` while
        // `crates/ataqu-infra-repositories/src/vista_repo_impl.rs` queries
        // `vista.dashboards`, `vista.aggregated_views` and `vista.data_points`.
        // Move them into `vista` so the VISTA aggregate endpoints resolve.

        // vault read models (e.g. `VaultRepositoryImpl::list_products`)
        // require a `version` column that the original inventory CREATE
        // TABLEs never declared. Backfill it so list endpoints resolve.
        db.execute_unprepared(
            r#"
            ALTER TABLE vault.products
                ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

            ALTER TABLE vault.variants
                ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
            "#,
        )
        .await?;
        db.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS vista.aggregated_views (
                tenant_id UUID PRIMARY KEY,
                total_events BIGINT NOT NULL DEFAULT 0,
                total_contacts BIGINT NOT NULL DEFAULT 0,
                total_deals BIGINT NOT NULL DEFAULT 0,
                total_deals_won BIGINT NOT NULL DEFAULT 0,
                total_pipeline_value NUMERIC NOT NULL DEFAULT 0,
                total_revenue NUMERIC NOT NULL DEFAULT 0,
                total_products BIGINT NOT NULL DEFAULT 0,
                low_stock_variants BIGINT NOT NULL DEFAULT 0,
                total_bookings BIGINT NOT NULL DEFAULT 0,
                pending_leave_requests BIGINT NOT NULL DEFAULT 0,
                last_updated_at TIMESTAMPTZ NOT NULL
            );

            CREATE TABLE IF NOT EXISTS vista.dashboards (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                name TEXT NOT NULL,
                config JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL,
                version INT NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS vista.data_points (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                metric_name TEXT NOT NULL,
                value DOUBLE PRECISION NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_data_points_tenant_metric
                ON vista.data_points (tenant_id, metric_name);
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
