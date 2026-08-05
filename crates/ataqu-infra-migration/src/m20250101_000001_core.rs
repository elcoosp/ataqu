use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        println!("🔵 Running CORE migration...");

        // Create core schema
        db.execute_unprepared("CREATE SCHEMA IF NOT EXISTS core;")
            .await?;
        println!("  ✅ core schema created");

        // Create app_schema ENUM (with error handling)
        db.execute_unprepared(
            "DO $$ BEGIN
                CREATE TYPE app_schema AS ENUM ('core', 'collab_crm', 'collab_ops', 'vault', 'dial', 'vista', 'sond', 'tempo');
             EXCEPTION
                WHEN duplicate_object THEN NULL;
             END $$;"
        ).await?;
        println!("  ✅ app_schema ENUM created");

        // Create core.outbox
        db.execute_unprepared(
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
            "#,
        )
        .await?;
        println!("  ✅ core.outbox created");

        // Create core.idempotency_records with CHECK constraint in-line
        db.execute_unprepared(
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
            "#,
        )
        .await?;
        println!("  ✅ core.idempotency_records created");

        db.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS core.audit_logs (
                id BIGSERIAL PRIMARY KEY,
                tenant_id UUID,
                user_id UUID,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id UUID,
                metadata JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#,
        )
        .await?;
        println!("  ✅ core.audit_logs created");

        db.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS core.scheduled_tasks (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                task_type TEXT NOT NULL,
                payload JSONB NOT NULL,
                scheduled_for TIMESTAMPTZ NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#,
        )
        .await?;
        println!("  ✅ core.scheduled_tasks created");

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared("DROP TABLE IF EXISTS core.idempotency_records;")
            .await?;
        db.execute_unprepared("DROP TABLE IF EXISTS core.outbox;")
            .await?;
        db.execute_unprepared("DROP TYPE IF EXISTS app_schema;")
            .await?;
        Ok(())
    }
}
