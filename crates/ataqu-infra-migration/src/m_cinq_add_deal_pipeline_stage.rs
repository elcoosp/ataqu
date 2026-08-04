use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_crm.deals
            ADD COLUMN IF NOT EXISTS pipeline_stage_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
            "#
        ).await?;
        // Add a default stage for existing rows (optional, but we set a default UUID)
        // Also create an index
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_deals_pipeline_stage ON collab_crm.deals (pipeline_stage_id);"
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "ALTER TABLE collab_crm.deals DROP COLUMN IF EXISTS pipeline_stage_id;"
        ).await?;
        Ok(())
    }
}
