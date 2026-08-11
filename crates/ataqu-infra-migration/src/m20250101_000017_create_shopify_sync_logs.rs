use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000017_create_shopify_sync_logs"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("vault"), Alias::new("shopify_sync_logs")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .big_integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("sync_type")).string().not_null())
                    .col(ColumnDef::new(Alias::new("status")).string().not_null())
                    .col(ColumnDef::new(Alias::new("product_id")).uuid())
                    .col(ColumnDef::new(Alias::new("shopify_id")).big_integer())
                    .col(ColumnDef::new(Alias::new("error_message")).text())
                    .col(
                        ColumnDef::new(Alias::new("retry_count"))
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
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
                    .name("idx_shopify_sync_logs_tenant")
                    .table((Alias::new("vault"), Alias::new("shopify_sync_logs")))
                    .col(Alias::new("tenant_id"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("vault"), Alias::new("shopify_sync_logs")))
                    .to_owned(),
            )
            .await
    }
}
