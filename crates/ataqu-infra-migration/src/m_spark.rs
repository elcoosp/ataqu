use sea_orm_migration::prelude::*;
use async_trait::async_trait;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
<<<<<<< HEAD
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

||||||| 87023c1
        // ── collab_crm.workflows ───────────────────────────────────
        manager
            .create_table(
                Table::create()
                    .table(Workflows::Table)
                    .schema("collab_crm")
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
                    .table(Workflows::Table)
                    .schema("collab_crm")
                    .col(Workflows::TenantId)
                    .to_owned(),
            )
            .await?;

        // ── collab_crm.leases ──────────────────────────────────────
        manager
            .create_table(
                Table::create()
                    .table(Leases::Table)
                    .schema("collab_crm")
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
                    .table(Leases::Table)
                    .schema("collab_crm")
                    .col(Leases::WorkflowId)
                    .unique()
                    .to_owned(),
            )
            .await?;

=======
        let conn = manager.get_connection();
        conn.execute_unprepared("CREATE SCHEMA IF NOT EXISTS collab_crm;").await?;
        
>>>>>>> origin/main
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
<<<<<<< HEAD
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
||||||| 87023c1
        manager
            .drop_table(
                Table::drop()
                    .table(Leases::Table)
                    .schema("collab_crm")
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table(Workflows::Table)
                    .schema("collab_crm")
                    .to_owned(),
            )
            .await?;
=======
        let conn = manager.get_connection();
        
>>>>>>> origin/main
        Ok(())
    }
}
