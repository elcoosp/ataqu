use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("CREATE SCHEMA IF NOT EXISTS collab_crm")
            .await?;

        // Workflows table
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_crm"), Workflows::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Workflows::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Workflows::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Workflows::Name).string().not_null())
                    .col(
                        ColumnDef::new(Workflows::Definition)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Workflows::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Workflows::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Workflows::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Leases table
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_crm"), Leases::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(Leases::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Leases::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Leases::WorkflowId).uuid().not_null())
                    .col(ColumnDef::new(Leases::FenceToken).big_integer().not_null())
                    .col(ColumnDef::new(Leases::Holder).string())
                    .col(ColumnDef::new(Leases::ExpiresAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Leases::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Leases::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_workflows_tenant")
                    .table((Alias::new("collab_crm"), Workflows::Table))
                    .col(Workflows::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_leases_workflow")
                    .table((Alias::new("collab_crm"), Leases::Table))
                    .col(Leases::WorkflowId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_crm"), Leases::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_crm"), Workflows::Table))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Workflows {
    Table,
    Id,
    TenantId,
    Name,
    Definition,
    Enabled,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Leases {
    Table,
    Id,
    TenantId,
    WorkflowId,
    FenceToken,
    Holder,
    ExpiresAt,
    CreatedAt,
    UpdatedAt,
}
