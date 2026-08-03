use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        // Create all schemas
        for schema in &["core", "collab_crm", "collab_ops", "vault", "dial", "vista"] {
            conn.execute_unprepared(&format!("CREATE SCHEMA IF NOT EXISTS {};", schema)).await?;
        }

        // Create the app roles (idempotent with DO block)
        for role in &["core_role", "cinq_role", "ops_role", "vault_role", "dial_role", "vista_role", "dispatcher_role", "admin_role"] {
            let sql = format!("DO $$ BEGIN CREATE ROLE {}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;", role);
            conn.execute_unprepared(&sql).await?;
        }

        // Create app_schema ENUM (simple, no exception handling because we only run once)
        conn.execute_unprepared(
            "CREATE TYPE app_schema AS ENUM ('core', 'collab_crm', 'collab_ops', 'vault', 'dial', 'vista');"
        ).await?;

        // Create core.outbox table
        conn.execute_unprepared(
            r#"
            CREATE TABLE core.outbox (
                id BIGSERIAL PRIMARY KEY,
                schema app_schema NOT NULL,
                event_type TEXT NOT NULL,
                aggregate_id UUID,
                payload JSONB NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                priority TEXT NOT NULL DEFAULT 'normal',
                attempts INT NOT NULL DEFAULT 0,
                locked_until TIMESTAMPTZ,
                vista_consumed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                completed_at TIMESTAMPTZ
            );
            "#
        ).await?;

        // Create core.idempotency_records
        conn.execute_unprepared(
            r#"
            CREATE TABLE core.idempotency_records (
                command_id UUID PRIMARY KEY,
                status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
                response_status SMALLINT,
                response_body JSONB,
                response_headers JSONB DEFAULT '{}'::jsonb,
                aggregate_id UUID,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                completed_at TIMESTAMPTZ
            );
            "#
        ).await?;

        // Grant sequence usage to all domain roles
        conn.execute_unprepared(
            "GRANT USAGE, SELECT ON SEQUENCE core.outbox_id_seq TO core_role, cinq_role, ops_role, vault_role, dial_role, vista_role;"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS core.idempotency_records;").await?;
        conn.execute_unprepared("DROP TABLE IF EXISTS core.outbox;").await?;
        conn.execute_unprepared("DROP TYPE IF EXISTS app_schema;").await?;
        Ok(())
    }
}
