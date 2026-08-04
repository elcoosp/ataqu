use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("vault"), Alias::new("stock_movements")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("variant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("quantity")).big_integer().not_null())
                    .col(ColumnDef::new(Alias::new("reason")).text().not_null())
                    .col(ColumnDef::new(Alias::new("reference")).text())
                    .col(
                        ColumnDef::new(Alias::new("timestamp"))
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_stock_movements_variant")
                    .table((Alias::new("vault"), Alias::new("stock_movements")))
                    .col(Alias::new("variant_id"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("vault"), Alias::new("stock_movements")))
                    .to_owned(),
            )
            .await
    }
}
