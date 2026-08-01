use sea_orm::{ConnectionTrait, DatabaseTransaction, DbBackend, DbErr, Statement};
use serde_json::json;
use uuid::Uuid;

/// Mirrors the trait defined in `ataqu-domain-pause`
#[allow(async_fn_in_trait)]
pub trait PauseRepository {
    async fn create_employee(
        &self,
        txn: &mut DatabaseTransaction,
        tenant_id: &Uuid,
        employee_id: Uuid,
        first_name: String,
        last_name: String,
        email: String,
    ) -> Result<(), DbErr>;
}

pub struct PauseRepositoryImpl;

impl PauseRepository for PauseRepositoryImpl {
    async fn create_employee(
        &self,
        txn: &mut DatabaseTransaction,
        tenant_id: &Uuid,
        employee_id: Uuid,
        first_name: String,
        last_name: String,
        email: String,
    ) -> Result<(), DbErr> {
        // Build JSON payload first using references to avoid moving the strings
        let payload = json!({
            "employee_id": employee_id,
            "first_name": &first_name,
            "last_name": &last_name,
            "email": &email
        });

        let insert_employee = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO collab_ops.employees (id, tenant_id, first_name, last_name, email, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            "#,
            vec![
                employee_id.into(),
                (*tenant_id).into(),
                first_name.into(),
                last_name.into(),
                email.into(),
            ],
        );
        txn.execute_raw(insert_employee).await?;

        let insert_outbox = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO core.outbox (schema, event_type, aggregate_id, payload, status, priority)
            VALUES ('collab_ops'::app_schema, 'EmployeeCreatedV1', $1, $2, 'pending', 'normal')
            "#,
            vec![employee_id.into(), payload.into()],
        );
        txn.execute_raw(insert_outbox).await?;

        let notify = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT pg_notify('outbox_event', '')",
            vec![],
        );
        txn.execute_raw(notify).await?;

        Ok(())
    }
}
