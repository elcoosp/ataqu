use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Alias::new("forms")))
                    .add_column(
                        ColumnDef::new(Alias::new("mode"))
                            .string()
                            .not_null()
                            .default("standard"),
                    )
                    .to_owned(),
            )
            .await
    }
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Alias::new("forms")))
                    .drop_column(Alias::new("mode"))
                    .to_owned(),
            )
            .await
    }
}
