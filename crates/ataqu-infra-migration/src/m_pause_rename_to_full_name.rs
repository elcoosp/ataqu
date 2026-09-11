use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop first_name and last_name if they exist
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Employee::Table))
                    .drop_column(Alias::new("first_name"))
                    .to_owned(),
            )
            .await
            .ok();

        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Employee::Table))
                    .drop_column(Alias::new("last_name"))
                    .to_owned(),
            )
            .await
            .ok();

        // Add full_name
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Employee::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Employee::FullName)
                            .text()
                            .not_null()
                            .default("Unknown"),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Employee::Table))
                    .drop_column(Employee::FullName)
                    .to_owned(),
            )
            .await
            .ok();

        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Employee::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("first_name"))
                            .text()
                            .not_null()
                            .default("Unknown"),
                    )
                    .to_owned(),
            )
            .await
            .ok();

        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Employee::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("last_name"))
                            .text()
                            .not_null()
                            .default("Unknown"),
                    )
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Employee {
    Table,
    FullName,
}
