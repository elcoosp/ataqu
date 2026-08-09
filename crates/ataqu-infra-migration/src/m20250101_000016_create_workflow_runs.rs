use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000016_create_workflow_runs"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_crm"), WorkflowRuns::Table))
                    .col(
                        ColumnDef::new(WorkflowRuns::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(WorkflowRuns::TenantId).uuid().not_null())
                    .col(ColumnDef::new(WorkflowRuns::WorkflowId).uuid().not_null())
                    .col(
                        ColumnDef::new(WorkflowRuns::Status)
                            .text()
                            .not_null()
                            .default("running"),
                    )
                    .col(
                        ColumnDef::new(WorkflowRuns::Payload)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WorkflowRuns::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(WorkflowRuns::UpdatedAt)
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
                    .name("idx_workflow_runs_tenant_status")
                    .table((Alias::new("collab_crm"), WorkflowRuns::Table))
                    .col(WorkflowRuns::TenantId)
                    .col(WorkflowRuns::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_workflow_runs_workflow_id")
                    .table((Alias::new("collab_crm"), WorkflowRuns::Table))
                    .col(WorkflowRuns::WorkflowId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_crm"), WorkflowRuns::Table))
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum WorkflowRuns {
    Table,
    Id,
    TenantId,
    WorkflowId,
    Status,
    Payload,
    CreatedAt,
    UpdatedAt,
}
