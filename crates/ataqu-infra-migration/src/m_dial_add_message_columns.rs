use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop sender_id if it exists
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("dial"), Messages::Table))
                    .drop_column(Alias::new("sender_id"))
                    .to_owned(),
            )
            .await
            .ok();

        // Add author_id
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("dial"), Messages::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("author_id"))
                            .uuid()
                            .not_null()
                            .default(Expr::cust("'00000000-0000-0000-0000-000000000000'")),
                    )
                    .to_owned(),
            )
            .await?;

        // Add edited_at
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("dial"), Messages::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Messages::EditedAt).timestamp_with_time_zone(),
                    )
                    .to_owned(),
            )
            .await?;

        // Add deleted_at
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("dial"), Messages::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Messages::DeletedAt).timestamp_with_time_zone(),
                    )
                    .to_owned(),
            )
            .await?;

        // Add thread_id
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("dial"), Messages::Table))
                    .add_column_if_not_exists(ColumnDef::new(Messages::ThreadId).uuid())
                    .to_owned(),
            )
            .await?;

        // Create index on thread_id
        manager
            .create_index(
                Index::create()
                    .name("idx_messages_thread")
                    .table((Alias::new("dial"), Messages::Table))
                    .col(Messages::ThreadId)
                    .to_owned(),
            )
            .await
            .ok();

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("dial"), Messages::Table))
                    .drop_column(Messages::EditedAt)
                    .to_owned(),
            )
            .await
            .ok();
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("dial"), Messages::Table))
                    .drop_column(Messages::DeletedAt)
                    .to_owned(),
            )
            .await
            .ok();
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("dial"), Messages::Table))
                    .drop_column(Messages::ThreadId)
                    .to_owned(),
            )
            .await
            .ok();
        Ok(())
    }
}

#[derive(Iden)]
enum Messages {
    Table,
    EditedAt,
    DeletedAt,
    ThreadId,
}
