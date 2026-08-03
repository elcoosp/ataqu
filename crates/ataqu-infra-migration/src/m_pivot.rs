use sea_orm::Statement;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
#[allow(dead_code)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Create collab_ops.documents
        db.execute_raw(Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            r#"
            CREATE TABLE IF NOT EXISTS collab_ops.documents (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                metadata JSONB,
                search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#,
            [],
        )).await?;

        db.execute_raw(Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON collab_ops.documents USING GIN (search_vector);",
            [],
        )).await?;

        // Create collab_ops.databases
        db.execute_raw(Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            r#"
            CREATE TABLE IF NOT EXISTS collab_ops.databases (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                name TEXT NOT NULL,
                connection_string TEXT NOT NULL,
                metadata JSONB,
                search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#,
            [],
        )).await?;

        db.execute_raw(Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "CREATE INDEX IF NOT EXISTS idx_databases_search_vector ON collab_ops.databases USING GIN (search_vector);",
            [],
        )).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_raw(Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "DROP TABLE IF EXISTS collab_ops.documents;",
            [],
        )).await?;
        db.execute_raw(Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "DROP TABLE IF EXISTS collab_ops.databases;",
            [],
        )).await?;
        Ok(())
    }
}
