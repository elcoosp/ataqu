use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_crm"), Alias::new("contacts")))
                    .add_column(ColumnDef::new(Alias::new("company")).text().null())
                    .to_owned(),
            )
            .await
    }
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_crm"), Alias::new("contacts")))
                    .drop_column(Alias::new("company"))
                    .to_owned(),
            )
            .await
    }
}
