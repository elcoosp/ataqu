use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_schema(
                Schema::create_schema().name("vista").if_not_exists().to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(VistaAggregations::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(VistaAggregations::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(VistaAggregations::TenantId).uuid().not_null())
                    .col(ColumnDef::new(VistaAggregations::Cursor).big_integer().not_null())
                    .col(ColumnDef::new(VistaAggregations::LastProcessedAt).timestamp_with_time_zone().not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_vista_aggregations_tenant")
                    .table(VistaAggregations::Table)
                    .col(VistaAggregations::TenantId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(VistaAggregations::Table).to_owned())
            .await?;
        manager
            .drop_schema(
                Schema::drop_schema().name("vista").if_exists().to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
pub enum VistaAggregations {
    Table,
    Id,
    TenantId,
    Cursor,
    LastProcessedAt,
}
