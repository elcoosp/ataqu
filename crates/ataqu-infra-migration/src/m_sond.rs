use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("CREATE SCHEMA IF NOT EXISTS collab_ops")
            .await?;

        // Forms
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_ops"), Forms::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(Forms::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Forms::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Forms::Title).text().not_null())
                    .col(ColumnDef::new(Forms::Description).text())
                    .col(ColumnDef::new(Forms::SchemaJson).json_binary().not_null())
                    .col(
                        ColumnDef::new(Forms::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Forms::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Forms::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Submissions
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_ops"), Submissions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Submissions::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Submissions::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Submissions::FormId).uuid().not_null())
                    .col(ColumnDef::new(Submissions::RespondentId).uuid())
                    .col(
                        ColumnDef::new(Submissions::ResponseData)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Submissions::SubmittedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Foreign key and indexes (raw SQL for constraint)
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "ALTER TABLE collab_ops.submissions ADD CONSTRAINT fk_submissions_form FOREIGN KEY (form_id) REFERENCES collab_ops.forms(id) ON DELETE CASCADE;"
        ).await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_submissions_tenant")
                    .table((Alias::new("collab_ops"), Submissions::Table))
                    .col(Submissions::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_submissions_form")
                    .table((Alias::new("collab_ops"), Submissions::Table))
                    .col(Submissions::FormId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_ops"), Submissions::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_ops"), Forms::Table))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Forms {
    Table,
    Id,
    TenantId,
    Title,
    Description,
    SchemaJson,
    IsActive,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Submissions {
    Table,
    Id,
    TenantId,
    FormId,
    RespondentId,
    ResponseData,
    SubmittedAt,
}
