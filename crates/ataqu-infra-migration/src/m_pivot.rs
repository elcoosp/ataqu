use sea_orm_migration::prelude::*;
use sea_orm_migration::async_trait::async_trait;
use sea_orm_migration::sea_query::{Alias, IndexType};

#[derive(DeriveMigrationName)]
#[allow(dead_code)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // collab_ops.documents
        manager
            .create_table(
                Table::create()
                    .table(Documents::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Documents::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Documents::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Documents::Title).text().not_null())
                    .col(ColumnDef::new(Documents::Content).text())
                    .col(ColumnDef::new(Documents::Metadata).json_binary())
                    .col(
                        ColumnDef::new(Documents::SearchVector)
                            .custom(Alias::new("tsvector"))
                            .generated(
                                Expr::cust("to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))"),
                                true, // stored
                            ),
                    )
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

        manager
            .create_index(
                Index::create()
                    .name("idx_documents_search_vector")
                    .table(Documents::Table)
                    .col(Documents::SearchVector)
                    .index_type(IndexType::Custom("GIN".into()))
                    .to_owned(),
            )
            .await?;

        // collab_ops.databases
        manager
            .create_table(
                Table::create()
                    .table(Databases::Table)
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
                    .col(
                        ColumnDef::new(Databases::SearchVector)
                            .custom(Alias::new("tsvector"))
                            .generated(
                                Expr::cust("to_tsvector('english', coalesce(name, ''))"),
                                true, // stored
                            ),
                    )
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

        manager
            .create_index(
                Index::create()
                    .name("idx_databases_search_vector")
                    .table(Databases::Table)
                    .col(Databases::SearchVector)
                    .index_type(IndexType::Custom("GIN".into()))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Documents::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Databases::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
#[allow(dead_code)]
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

#[derive(DeriveIden)]
#[allow(dead_code)]
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