use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_crm"), Alias::new("tasks")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("contact_id")).uuid())
                    .col(ColumnDef::new(Alias::new("deal_id")).uuid())
                    .col(ColumnDef::new(Alias::new("assigned_to")).uuid())
                    .col(ColumnDef::new(Alias::new("title")).text().not_null())
                    .col(ColumnDef::new(Alias::new("description")).text())
                    .col(ColumnDef::new(Alias::new("due_date")).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Alias::new("status"))
                            .text()
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("updated_at"))
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_tasks_tenant_contact")
                    .table((Alias::new("collab_crm"), Alias::new("tasks")))
                    .col(Alias::new("tenant_id"))
                    .col(Alias::new("contact_id"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_crm"), Alias::new("tasks")))
                    .to_owned(),
            )
            .await
    }
}
