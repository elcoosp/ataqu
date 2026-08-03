use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(Iden)]
pub enum Employee {
    Table,
    Id,
    TenantId,
    FirstName,
    LastName,
    Email,
    CreatedAt,
}

#[derive(Iden)]
pub enum LeaveRequest {
    Table,
    Id,
    TenantId,
    EmployeeId,
    StartDate,
    EndDate,
    Status,
    CreatedAt,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create schema
        manager
            .get_connection()
            .execute_unprepared("CREATE SCHEMA IF NOT EXISTS collab_ops")
            .await?;

        // Employees
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_ops"), Employee::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(Employee::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Employee::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Employee::FirstName).string().not_null())
                    .col(ColumnDef::new(Employee::LastName).string().not_null())
                    .col(ColumnDef::new(Employee::Email).string().not_null())
                    .col(ColumnDef::new(Employee::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .to_owned(),
            )
            .await?;

        // Leave requests
        manager
            .create_table(
                Table::create()
                    .table((Alias::new("collab_ops"), LeaveRequest::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(LeaveRequest::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(LeaveRequest::TenantId).uuid().not_null())
                    .col(ColumnDef::new(LeaveRequest::EmployeeId).uuid().not_null())
                    .col(ColumnDef::new(LeaveRequest::StartDate).date().not_null())
                    .col(ColumnDef::new(LeaveRequest::EndDate).date().not_null())
                    .col(ColumnDef::new(LeaveRequest::Status).string().not_null().default("pending"))
                    .col(ColumnDef::new(LeaveRequest::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table((Alias::new("collab_ops"), LeaveRequest::Table)).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table((Alias::new("collab_ops"), Employee::Table)).to_owned())
            .await?;
        Ok(())
    }
}
