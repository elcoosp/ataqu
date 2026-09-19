use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000022_create_dial_tickets"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // dial.tickets — matches entities/dial/ticket.rs (docs P0-9).
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("dial"), Alias::new("tickets")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("subject")).text().not_null())
                    .col(ColumnDef::new(Alias::new("description")).text())
                    .col(
                        ColumnDef::new(Alias::new("status"))
                            .text()
                            .not_null()
                            .default("open"),
                    )
                    .col(
                        ColumnDef::new(Alias::new("priority"))
                            .text()
                            .not_null()
                            .default("medium"),
                    )
                    .col(
                        ColumnDef::new(Alias::new("requester_name"))
                            .text()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(Alias::new("requester_email"))
                            .text()
                            .not_null()
                            .default(""),
                    )
                    .col(ColumnDef::new(Alias::new("assignee_id")).uuid())
                    .col(ColumnDef::new(Alias::new("channel_type")).text())
                    .col(ColumnDef::new(Alias::new("message_id")).uuid())
                    .col(ColumnDef::new(Alias::new("last_message")).text())
                    .col(ColumnDef::new(Alias::new("last_message_at")).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Alias::new("updated_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // dial.ticket_messages — matches entities/dial/ticket_message.rs.
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("dial"), Alias::new("ticket_messages")))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("tenant_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("ticket_id")).uuid().not_null())
                    .col(
                        ColumnDef::new(Alias::new("from_customer"))
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(Alias::new("content")).text().not_null())
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
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
                    .name("idx_dial_tickets_tenant")
                    .table((Alias::new("dial"), Alias::new("tickets")))
                    .col(Alias::new("tenant_id"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_dial_tickets_status")
                    .table((Alias::new("dial"), Alias::new("tickets")))
                    .col(Alias::new("status"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_dial_ticket_messages_ticket")
                    .table((Alias::new("dial"), Alias::new("ticket_messages")))
                    .col(Alias::new("ticket_id"))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("dial"), Alias::new("ticket_messages")))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Alias::new("dial"), Alias::new("tickets")))
                    .to_owned(),
            )
            .await
    }
}
