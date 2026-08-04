use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("CREATE SCHEMA IF NOT EXISTS collab_ops")
            .await?;

        // Bookings table with plain ends_at (not generated)
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_ops"), Bookings::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(Bookings::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Bookings::TenantId).uuid().not_null())
                    .col(
                        ColumnDef::new(Bookings::StartsAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Bookings::DurationSeconds)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Bookings::EndsAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Bookings::OauthAccessToken).string())
                    .col(ColumnDef::new(Bookings::OauthRefreshToken).string())
                    .col(ColumnDef::new(Bookings::OauthTokenExpiresAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Bookings::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Bookings::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_bookings_tenant_id")
                    .table((Alias::new("collab_ops"), Bookings::Table))
                    .col(Bookings::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_bookings_ends_at")
                    .table((Alias::new("collab_ops"), Bookings::Table))
                    .col(Bookings::EndsAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("collab_ops"), Bookings::Table))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Bookings {
    Table,
    Id,
    TenantId,
    StartsAt,
    DurationSeconds,
    EndsAt,
    OauthAccessToken,
    OauthRefreshToken,
    OauthTokenExpiresAt,
    CreatedAt,
    UpdatedAt,
}
