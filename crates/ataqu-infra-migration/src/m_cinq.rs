use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create schema via raw SQL
        manager
            .get_connection()
            .execute_unprepared("CREATE SCHEMA IF NOT EXISTS collab_crm")
            .await?;

        // Create contacts table
        manager
            .create_table(
                Table::create()
                    .table(Contacts::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Contacts::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Contacts::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Contacts::Name).string().not_null())
                    .col(ColumnDef::new(Contacts::Email).string())
                    .col(ColumnDef::new(Contacts::Phone).string())
                    .col(
                        ColumnDef::new(Contacts::CustomFields)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Contacts::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Contacts::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create deals table
        manager
            .create_table(
                Table::create()
                    .table(Deals::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Deals::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Deals::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Deals::ContactId).uuid().not_null())
                    .col(ColumnDef::new(Deals::Title).string().not_null())
                    .col(ColumnDef::new(Deals::Amount).decimal().not_null())
                    .col(ColumnDef::new(Deals::Status).string().not_null())
                    .col(ColumnDef::new(Deals::CustomFields).json_binary().not_null())
                    .col(
                        ColumnDef::new(Deals::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Deals::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create email_tracking table
        manager
            .create_table(
                Table::create()
                    .table(EmailTracking::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EmailTracking::Id)
                            .big_integer()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(EmailTracking::TenantId).uuid().not_null())
                    .col(ColumnDef::new(EmailTracking::ContactId).uuid().not_null())
                    .col(ColumnDef::new(EmailTracking::EventType).string().not_null())
                    .col(
                        ColumnDef::new(EmailTracking::Metadata)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(EmailTracking::OccurredAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(EmailTracking::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // GIN indexes for JSONB exact match via raw SQL
        let conn = manager.get_connection();
        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_contacts_custom_fields_gin ON collab_crm.contacts USING GIN (custom_fields)"
        ).await?;

        conn.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_deals_custom_fields_gin ON collab_crm.deals USING GIN (custom_fields)"
        ).await?;

        // Indexes for tenant isolation
        manager
            .create_index(
                Index::create()
                    .name("idx_contacts_tenant_id")
                    .table(Contacts::Table)
                    .col(Contacts::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_deals_tenant_id")
                    .table(Deals::Table)
                    .col(Deals::TenantId)
                    .to_owned(),
            )
            .await?;

        // Index for email tracking
        manager
            .create_index(
                Index::create()
                    .name("idx_email_tracking_tenant_contact")
                    .table(EmailTracking::Table)
                    .col(EmailTracking::TenantId)
                    .col(EmailTracking::ContactId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Contacts::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Deals::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(EmailTracking::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Contacts {
    Table,
    Id,
    TenantId,
    Name,
    Email,
    Phone,
    CustomFields,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Deals {
    Table,
    Id,
    TenantId,
    ContactId,
    Title,
    Amount,
    Status,
    CustomFields,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum EmailTracking {
    Table,
    Id,
    TenantId,
    ContactId,
    EventType,
    Metadata,
    OccurredAt,
    CreatedAt,
}
