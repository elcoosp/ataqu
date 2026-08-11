use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_crm"), Alias::new("pending_approvals")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("workflow_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("run_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("approver_role")).text().not_null())
                    .col(
                        ColumnDef::new(Alias::new("status"))
                            .text()
                            .not_null()
                            .default("pending"),
                    )
                    .col(ColumnDef::new(Alias::new("payload")).json_binary().not_null())
                    .col(
                        ColumnDef::new(Alias::new("approved_by"))
                            .uuid(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("approved_at"))
                            .timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Alias::new("updated_at"))
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
                    .name("idx_pending_approvals_tenant_status")
                    .table((Alias::new("collab_crm"), Alias::new("pending_approvals")))
                    .col(Alias::new("tenant_id"))
                    .col(Alias::new("status"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_pending_approvals_run_id")
                    .table((Alias::new("collab_crm"), Alias::new("pending_approvals")))
                    .col(Alias::new("run_id"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_crm"), Alias::new("pending_approvals")))
                    .to_owned(),
            )
            .await
    }
}
