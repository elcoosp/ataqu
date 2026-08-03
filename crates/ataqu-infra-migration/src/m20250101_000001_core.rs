use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::ConnectionTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();

        conn.execute_unprepared("CREATE SCHEMA IF NOT EXISTS core;").await?;

        conn.execute_unprepared(
            "DO $$ BEGIN
                CREATE TYPE app_schema AS ENUM ('core', 'collab_crm', 'collab_ops', 'vault', 'dial', 'vista');
             EXCEPTION
                WHEN duplicate_object THEN NULL;
             END $$;"
        ).await?;

        // core.outbox
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("core"), Outbox::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(Outbox::Id).big_integer().not_null().auto_increment().primary_key())
                    .col(ColumnDef::new(Outbox::Schema).custom(Alias::new("app_schema")).not_null())
                    .col(ColumnDef::new(Outbox::EventType).string().not_null())
                    .col(ColumnDef::new(Outbox::AggregateId).uuid())
                    .col(ColumnDef::new(Outbox::Payload).json_binary().not_null())
                    .col(ColumnDef::new(Outbox::Status).string().not_null().default("pending"))
                    .col(ColumnDef::new(Outbox::Priority).string().not_null().default("normal"))
                    .col(ColumnDef::new(Outbox::Attempts).integer().not_null().default(0))
                    .col(ColumnDef::new(Outbox::LockedUntil).timestamp_with_time_zone())
                    .col(ColumnDef::new(Outbox::VistaConsumedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(Outbox::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(Outbox::CompletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // core.idempotency_records
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("core"), IdempotencyRecord::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(IdempotencyRecord::CommandId).uuid().not_null().primary_key())
                    .col(ColumnDef::new(IdempotencyRecord::Status).string().not_null())
                    .col(ColumnDef::new(IdempotencyRecord::ResponseStatus).small_integer())
                    .col(ColumnDef::new(IdempotencyRecord::ResponseBody).json_binary())
                    .col(ColumnDef::new(IdempotencyRecord::ResponseHeaders).json_binary().default("{}"))
                    .col(ColumnDef::new(IdempotencyRecord::AggregateId).uuid())
                    .col(ColumnDef::new(IdempotencyRecord::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(IdempotencyRecord::CompletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        conn.execute_unprepared(
            "ALTER TABLE core.idempotency_records ADD CONSTRAINT status_check CHECK (status IN ('in_progress', 'completed', 'failed'));"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let conn = manager.get_connection();
        manager
            .drop_table(Table::drop().table((Alias::new("core"), IdempotencyRecord::Table)).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table((Alias::new("core"), Outbox::Table)).to_owned())
            .await?;
        conn.execute_unprepared("DROP TYPE IF EXISTS app_schema;").await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Outbox {
    Table,
    Id,
    Schema,
    EventType,
    AggregateId,
    Payload,
    Status,
    Priority,
    Attempts,
    LockedUntil,
    VistaConsumedAt,
    CreatedAt,
    CompletedAt,
}

#[derive(DeriveIden)]
enum IdempotencyRecord {
    Table,
    CommandId,
    Status,
    ResponseStatus,
    ResponseBody,
    ResponseHeaders,
    AggregateId,
    CreatedAt,
    CompletedAt,
}
