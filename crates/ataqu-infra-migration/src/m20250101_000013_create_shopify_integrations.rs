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
        // Ensure the vault schema exists (just in case)
        manager
            .get_connection()
            .execute_unprepared("CREATE SCHEMA IF NOT EXISTS vault;")
            .await?;

        manager
            .create_table(
                Table::create()
                    .table((Alias::new("vault"), Alias::new("shopify_integrations")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(
                        ColumnDef::new(Alias::new("shop_domain"))
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("access_token"))
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("last_synced_at"))
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
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
            .drop_table(
                Table::drop()
                    .table((Alias::new("vault"), Alias::new("shopify_integrations")))
                    .to_owned(),
            )
            .await
    }
}
