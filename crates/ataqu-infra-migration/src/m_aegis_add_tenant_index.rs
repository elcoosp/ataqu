use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_index(
                Index::create()
                    .name("idx_users_tenant_id")
                    .table((Alias::new("core"), Alias::new("users")))
                    .col(Alias::new("tenant_id"))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_users_tenant_id")
                    .table((Alias::new("core"), Alias::new("users")))
                    .to_owned(),
            )
            .await
    }
}
