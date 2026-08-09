use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000015_create_establishments"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create establishments table
        manager
            .create_table(
                Table::create()
                    .table(Establishments::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Establishments::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Establishments::TenantId).uuid().not_null())
                    .col(
                        ColumnDef::new(Establishments::CompanyName)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Establishments::Siret).string())
                    .col(ColumnDef::new(Establishments::Address).string())
                    .col(
                        ColumnDef::new(Establishments::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Establishments::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Index on tenant_id
        manager
            .create_index(
                Index::create()
                    .name("idx_establishments_tenant")
                    .table(Establishments::Table)
                    .col(Establishments::TenantId)
                    .to_owned(),
            )
            .await?;

        // Add establishment_id column to deals
        manager
            .alter_table(
                Table::alter()
                    .table(Deals::Table)
                    .add_column(ColumnDef::new(Deals::EstablishmentId).uuid().null())
                    .to_owned(),
            )
            .await?;

        // Foreign key constraint
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_deals_establishment")
                    .from(Deals::Table, Deals::EstablishmentId)
                    .to(Establishments::Table, Establishments::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_foreign_key(ForeignKey::drop().name("fk_deals_establishment").to_owned())
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Deals::Table)
                    .drop_column(Deals::EstablishmentId)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(Establishments::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Establishments {
    Table,
    Id,
    TenantId,
    CompanyName,
    Siret,
    Address,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Deals {
    Table,
    EstablishmentId,
}
