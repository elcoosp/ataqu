use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop duration_seconds if it exists
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Bookings::Table))
                    .drop_column(Alias::new("duration_seconds"))
                    .to_owned(),
            )
            .await.ok();

        // Add duration_minutes
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Bookings::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Bookings::DurationMinutes)
                            .integer()
                            .not_null()
                            .default(30),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Bookings::Table))
                    .drop_column(Bookings::DurationMinutes)
                    .to_owned(),
            )
            .await.ok();

        manager
            .alter_table(
                Table::alter()
                    .table((Alias::new("collab_ops"), Bookings::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("duration_seconds"))
                            .integer()
                            .not_null()
                            .default(1800),
                    )
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Bookings {
    Table,
    DurationMinutes,
}
