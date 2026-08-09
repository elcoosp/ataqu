use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000013_create_shopify_integrations"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ShopifyIntegrations::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ShopifyIntegrations::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ShopifyIntegrations::TenantId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ShopifyIntegrations::ShopDomain)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ShopifyIntegrations::AccessToken)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ShopifyIntegrations::LastSyncedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ShopifyIntegrations::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ShopifyIntegrations::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum ShopifyIntegrations {
    Table,
    Id,
    TenantId,
    ShopDomain,
    AccessToken,
    LastSyncedAt,
    CreatedAt,
}
