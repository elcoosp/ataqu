use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("vault"), Alias::new("shopify_integrations")))
                    .add_column(ColumnDef::new(Alias::new("scope")).text().null())
                    .to_owned(),
            )
            .await
    }
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("vault"), Alias::new("shopify_integrations")))
                    .drop_column(Alias::new("scope"))
                    .to_owned(),
            )
            .await
    }
}
