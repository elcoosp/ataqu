use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create schema
        manager
            .get_connection()
            .execute_unprepared("CREATE SCHEMA IF NOT EXISTS dial")
            .await?;

        // Channels
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("dial"), Channels::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(Channels::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Channels::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Channels::Name).string().not_null())
                    .col(ColumnDef::new(Channels::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(Channels::UpdatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .to_owned(),
            )
            .await?;

        // Messages
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("dial"), Messages::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(Messages::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Messages::ChannelId).uuid().not_null())
                    .col(ColumnDef::new(Messages::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Messages::SenderId).uuid().not_null())
                    .col(ColumnDef::new(Messages::Content).string().not_null())
                    .col(ColumnDef::new(Messages::SentAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(Messages::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .to_owned(),
            )
            .await?;

        // Indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_channels_tenant")
                    .table((Alias::new("dial"), Channels::Table))
                    .col(Channels::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_messages_tenant_channel")
                    .table((Alias::new("dial"), Messages::Table))
                    .col(Messages::TenantId)
                    .col(Messages::ChannelId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_messages_sent_at")
                    .table((Alias::new("dial"), Messages::Table))
                    .col(Messages::SentAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table((Alias::new("dial"), Messages::Table)).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table((Alias::new("dial"), Channels::Table)).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Channels {
    Table,
    Id,
    TenantId,
    Name,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Messages {
    Table,
    Id,
    ChannelId,
    TenantId,
    SenderId,
    Content,
    SentAt,
    CreatedAt,
}
