use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(AuthUser::Table)
                    .modify_column(ColumnDef::new(AuthUser::PasswordHash).null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(AuthUser::Table)
                    .modify_column(ColumnDef::new(AuthUser::PasswordHash).not_null())
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum AuthUser {
    Table,
    PasswordHash,
}
