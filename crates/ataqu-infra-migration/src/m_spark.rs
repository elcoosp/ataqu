//! Migration: SPARK — creates `collab_crm.workflows` and `collab_crm.leases`.
//!
//! The `leases` table includes a `fence_token` column (BIGINT, default 0)
//! used by ADR-020 (Post-Commit Atomic Fenced Leases). Acquiring a lease
//! atomically increments the fence token in a single UPDATE statement.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ── collab_crm.workflows ───────────────────────────────────
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
                    .col(ColumnDef::new(Workflows::Name).text().not_null())
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
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Workflows::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_workflows_tenant")
                    .table((Alias::new("collab_crm"), Workflows::Table))
                    .col(Workflows::TenantId)
                    .to_owned(),
            )
            .await?;

        // ── collab_crm.leases ──────────────────────────────────────
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_crm"), Leases::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Leases::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Leases::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Leases::WorkflowId).uuid().not_null())
                    .col(
                        ColumnDef::new(Leases::FenceToken)
                            .big_integer()
                            .not_null()
                            .default(0i64),
                    )
                    .col(ColumnDef::new(Leases::Holder).text().null())
                    .col(
                        ColumnDef::new(Leases::ExpiresAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Leases::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Leases::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_leases_workflow_id")
                            .from(Leases::Table, Leases::WorkflowId)
                            .to(Workflows::Table, Workflows::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // One lease row per workflow (unique constraint)
        manager
            .create_index(
                Index::create()
                    .name("idx_leases_workflow_unique")
                    .table((Alias::new("collab_crm"), Leases::Table))
                    .col(Leases::WorkflowId)
                    .unique()
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

#[derive(DeriveIden)]
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

#[derive(DeriveIden)]
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
