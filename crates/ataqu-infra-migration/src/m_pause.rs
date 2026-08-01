use sea_orm::Statement;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(Iden)]
pub enum Schema {
    #[iden = "collab_ops"]
    CollabOps,
}

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
        manager
            .create_table(
                Table::create()
                    .table((Schema::CollabOps, Employee::Table))
                    .if_not_exists()
                    .col(ColumnDef::new(Employee::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Employee::TenantId).uuid().not_null())
                    .col(ColumnDef::new(Employee::FirstName).string().not_null())
                    .col(ColumnDef::new(Employee::LastName).string().not_null())
                    .col(ColumnDef::new(Employee::Email).string().not_null())
                    .col(
                        ColumnDef::new(Employee::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table((Schema::CollabOps, LeaveRequest::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(LeaveRequest::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(LeaveRequest::TenantId).uuid().not_null())
                    .col(ColumnDef::new(LeaveRequest::EmployeeId).uuid().not_null())
                    .col(ColumnDef::new(LeaveRequest::StartDate).date().not_null())
                    .col(ColumnDef::new(LeaveRequest::EndDate).date().not_null())
                    .col(
                        ColumnDef::new(LeaveRequest::Status)
                            .string()
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(LeaveRequest::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .get_connection()
            .execute_raw(Statement::from_string(
                manager.get_database_backend(),
                "ALTER TABLE collab_ops.employees ENABLE ROW LEVEL SECURITY;".to_owned(),
            ))
            .await?;

        manager
            .get_connection()
            .execute_raw(Statement::from_string(
                manager.get_database_backend(),
                "CREATE POLICY employees_tenant_isolation ON collab_ops.employees FOR ALL TO ops_role USING (tenant_id = current_setting('app.current_tenant_id')::uuid);".to_owned(),
            ))
            .await?;

        manager
            .get_connection()
            .execute_raw(Statement::from_string(
                manager.get_database_backend(),
                "ALTER TABLE collab_ops.leave_requests ENABLE ROW LEVEL SECURITY;".to_owned(),
            ))
            .await?;

        manager
            .get_connection()
            .execute_raw(Statement::from_string(
                manager.get_database_backend(),
                "CREATE POLICY leave_requests_tenant_isolation ON collab_ops.leave_requests FOR ALL TO ops_role USING (tenant_id = current_setting('app.current_tenant_id')::uuid);".to_owned(),
            ))
            .await?;

        manager
            .get_connection()
            .execute_raw(Statement::from_string(
                manager.get_database_backend(),
                "GRANT USAGE, SELECT ON SEQUENCE core.outbox_id_seq TO ops_role;".to_owned(),
            ))
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::CollabOps, LeaveRequest::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::CollabOps, Employee::Table))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}
