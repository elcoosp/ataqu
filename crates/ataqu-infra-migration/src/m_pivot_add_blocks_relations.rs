use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS collab_ops.blocks (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                document_id UUID NOT NULL,
                block_type TEXT NOT NULL,
                content JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            );
            "#,
        ).await?;
        conn.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS collab_ops.relations (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                from_block_id UUID NOT NULL,
                to_block_id UUID NOT NULL,
                relation_type TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL
            );
            "#,
        ).await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_blocks_document ON collab_ops.blocks (document_id);",
        ).await?;
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_relations_blocks ON collab_ops.relations (from_block_id, to_block_id);",
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP TABLE IF EXISTS collab_ops.relations;").await?;
        conn.execute_unprepared("DROP TABLE IF EXISTS collab_ops.blocks;").await?;
        Ok(())
    }
}
