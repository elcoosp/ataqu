use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000023_add_email_tracking_unique"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        // Add a unique constraint on (tenant_id, contact_id, event_type, occurred_at)
        // to prevent duplicate tracking events.
        db.execute_unprepared(
            r#"
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'idx_email_tracking_unique'
                ) THEN
                    ALTER TABLE collab_crm.email_tracking
                    ADD CONSTRAINT idx_email_tracking_unique UNIQUE (tenant_id, contact_id, event_type, occurred_at);
                END IF;
            END $$;
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "ALTER TABLE collab_crm.email_tracking DROP CONSTRAINT IF EXISTS idx_email_tracking_unique;"
        ).await?;
        Ok(())
    }
}
