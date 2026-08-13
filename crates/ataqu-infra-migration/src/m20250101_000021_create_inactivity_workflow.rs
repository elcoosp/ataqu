use sea_orm_migration::prelude::*;
use uuid::Uuid;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        let workflow_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

        // Check if already exists
        let check_sql = format!(
            "SELECT 1 FROM collab_crm.workflows WHERE id = '{}'",
            workflow_id
        );
        let exists = db
            .query_one_raw(sea_orm::Statement::from_sql_and_values(
                sea_orm::DbBackend::Postgres,
                &check_sql,
                [],
            ))
            .await?
            .is_some();

        if exists {
            return Ok(());
        }

        // Build the definition JSON (trigger, conditions, actions)
        let definition = serde_json::json!({
            "trigger": {
                "type": "Event",
                "schema": "core",
                "event_type": "InactivityReminder"
            },
            "conditions": [],
            "actions": [
                {
                    "type": "SendEmail",
                    "to": "{{admin_email}}",
                    "subject": "Inactivity Reminder - Your Ataqu workspace has been idle",
                    "body": "Your Ataqu workspace has been inactive for {{days_inactive}} days. Please log in to continue using your workspace."
                }
            ]
        });

        let now = chrono::Utc::now();

        let insert_sql = r#"
            INSERT INTO collab_crm.workflows (
                id, tenant_id, name, definition, enabled, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7
            )
        "#;

        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            insert_sql,
            vec![
                workflow_id.into(),
                Uuid::nil().into(), // tenant_id = nil (system-wide)
                "Inactivity Reminder".into(),
                serde_json::to_value(&definition)
                    .unwrap_or(serde_json::Value::Null)
                    .into(),
                true.into(), // enabled
                now.into(),
                now.into(),
            ],
        );

        db.execute_raw(stmt).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        let delete_sql =
            "DELETE FROM collab_crm.workflows WHERE id = '11111111-1111-1111-1111-111111111111'";
        db.execute_raw(sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            delete_sql,
            [],
        ))
        .await?;
        Ok(())
    }
}
