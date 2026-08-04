use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("core"), Alias::new("api_keys")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("user_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("name")).text().not_null())
                    .col(ColumnDef::new(Alias::new("key_hash")).text().not_null().unique_key())
                    .col(ColumnDef::new(Alias::new("prefix")).text().not_null())
                    .col(ColumnDef::new(Alias::new("last_used_at")).timestamp_with_time_zone())
                    .col(ColumnDef::new(Alias::new("expires_at")).timestamp_with_time_zone())
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
                    .name("idx_api_keys_tenant_user")
                    .table((Alias::new("core"), Alias::new("api_keys")))
                    .col(Alias::new("tenant_id"))
                    .col(Alias::new("user_id"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("core"), Alias::new("api_keys")))
                    .to_owned(),
            )
            .await
    }
}
