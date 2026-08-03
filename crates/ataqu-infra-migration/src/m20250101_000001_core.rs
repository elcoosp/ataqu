use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        // Create core schema
        conn.execute_unprepared("CREATE SCHEMA IF NOT EXISTS core;").await?;

        // Create app_schema ENUM
        conn.execute_unprepared(
            "DO $$ BEGIN
                CREATE TYPE app_schema AS ENUM ('core', 'collab_crm', 'collab_ops', 'vault', 'dial', 'vista');
             EXCEPTION
                WHEN duplicate_object THEN NULL;
             END $$;"
        ).await?;

        // Create core.outbox table
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS core.outbox (
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
            CREATE TABLE IF NOT EXISTS core.idempotency_records (
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

        // Enable RLS on outbox and create policies (defer per-role policies to their own migrations)
        conn.execute_unprepared("ALTER TABLE core.outbox ENABLE ROW LEVEL SECURITY;").await?;

        // Grant sequence usage to all domain roles (they will be created later)
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
