use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS core.gdpr_saga_state (
                tenant_id UUID PRIMARY KEY,
                step TEXT NOT NULL CHECK (step IN ('deactivate_users', 'anonymize_pii', 'delete_s3_files', 'purge_tables', 'complete')),
                retry_count INT NOT NULL DEFAULT 0,
                manifest JSONB DEFAULT '[]'::jsonb,
                trace_id UUID NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared("DROP TABLE IF EXISTS core.gdpr_saga_state;")
            .await?;
        Ok(())
    }
}
