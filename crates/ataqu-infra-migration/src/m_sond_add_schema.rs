use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        conn.execute_unprepared("CREATE SCHEMA IF NOT EXISTS sond")
            .await?;
        // Add the form lifecycle column (draft | published | closed).
        // Same pattern as the `mode` column migration: string column with
        // a safe default so pre-existing rows stay valid.
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Alias::new("forms")))
                    .add_column(
                        ColumnDef::new(Alias::new("status"))
                            .string()
                            .not_null()
                            .default("draft"),
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
                    .drop_column(Alias::new("status"))
                    .to_owned(),
            )
            .await?;
        let conn = manager.get_connection();
        conn.execute_unprepared("DROP SCHEMA IF EXISTS sond CASCADE")
            .await?;
        Ok(())
    }
}
