use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
#[allow(dead_code)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("CREATE SCHEMA IF NOT EXISTS collab_ops")
            .await?;

        // Documents table
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_ops"), Documents::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Documents::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Documents::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Documents::Title).text().not_null())
                    .col(ColumnDef::new(Documents::Content).text())
                    .col(ColumnDef::new(Documents::Metadata).json_binary())
                    .col(ColumnDef::new(Documents::SearchVector).custom(Alias::new("tsvector")))
                    .col(
                        ColumnDef::new(Documents::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Documents::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Since SeaORM doesn't support generated columns in DSL, we need to alter the table after creation.
        let conn = manager.get_connection();
        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.documents
            ADD COLUMN IF NOT EXISTS search_vector tsvector
            GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;
            "#
        ).await?;

        // GIN index
        manager
            .create_index(
                Index::create()
                    .name("idx_documents_search_vector")
                    .table((Alias::new("collab_ops"), Documents::Table))
                    .col(Documents::SearchVector)
                    .index_type(sea_orm::sea_query::IndexType::Custom("GIN".into()))
                    .to_owned(),
            )
            .await?;

        // Databases table
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_ops"), Databases::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Databases::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Databases::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Databases::Name).text().not_null())
                    .col(
                        ColumnDef::new(Databases::ConnectionString)
                            .text()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Databases::Metadata).json_binary())
                    .col(ColumnDef::new(Databases::SearchVector).custom(Alias::new("tsvector")))
                    .col(
                        ColumnDef::new(Databases::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Databases::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        conn.execute_unprepared(
            r#"
            ALTER TABLE collab_ops.databases
            ADD COLUMN IF NOT EXISTS search_vector tsvector
            GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED;
            "#,
        )
        .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_databases_search_vector")
                    .table((Alias::new("collab_ops"), Databases::Table))
                    .col(Databases::SearchVector)
                    .index_type(sea_orm::sea_query::IndexType::Custom("GIN".into()))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_ops"), Documents::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_ops"), Databases::Table))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Documents {
    Table,
    Id,
    TenantId,
    Title,
    Content,
    Metadata,
    SearchVector,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Databases {
    Table,
    Id,
    TenantId,
    Name,
    ConnectionString,
    Metadata,
    SearchVector,
    CreatedAt,
    UpdatedAt,
}
