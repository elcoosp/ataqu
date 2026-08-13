use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        // Create activities table
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS collab_crm.activities (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                contact_id UUID NOT NULL,
                deal_id UUID,
                activity_type TEXT NOT NULL,
                description TEXT NOT NULL,
                scheduled_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#,
        )
        .await?;

        // Create pipeline stages table
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS collab_crm.pipeline_stages (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                name TEXT NOT NULL,
                "order" INT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#,
        )
        .await?;

        // Indexes
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_activities_tenant_contact ON collab_crm.activities (tenant_id, contact_id);",
        ).await?;
        conn.execute_unprepared(
"CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant_order ON collab_crm.pipeline_stages (tenant_id, \"order\");"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS collab_crm.activities;")
            .await?;
        conn.execute_unprepared("DROP TABLE IF EXISTS collab_crm.pipeline_stages;")
            .await?;
        Ok(())
    }
}
