use sea_orm_migration::prelude::*;
use uuid::Uuid;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Generate a fixed UUID for the workflow to avoid duplicates on re-run.
        let workflow_id = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();

        // Insert the workflow only if it doesn't exist.
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
            // tracing::info!("Inactivity reminder workflow already exists, skipping");
            return Ok(());
        }

        // Build the JSON for trigger, conditions, actions.
        // Trigger: listens to core.InactivityReminder events.
        let trigger = serde_json::json!({
            "type": "Event",
            "event_type": "InactivityReminder",
            "schema": "core"
        });

        // Conditions: none (we can add later to check days_inactive >= 7, but we already emit only for 7+ days)
        let conditions: Vec<serde_json::Value> = vec![];

        // Actions: SendEmail to the tenant admin.
        // We need to query the admin email, but we can use a placeholder and let the user customize.
        // For now, we'll use a simple email action with placeholders.
        let actions = vec![serde_json::json!({
            "type": "SendEmail",
            "to": "{{admin_email}}",  // This would need to be resolved by a workflow variable or a lookup step.
            "subject": "Inactivity Reminder - Your Ataqu workspace has been idle",
            "body": "Your Ataqu workspace has been inactive for {{days_inactive}} days. Please log in to continue using your workspace."
        })];

        let now = chrono::Utc::now();
        let insert_sql = r#"
            INSERT INTO collab_crm.workflows (
                id, tenant_id, name, trigger, conditions, actions, is_active, webhook_secret, created_at, updated_at, version
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            )
        "#;
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            insert_sql,
            vec![
                workflow_id.into(),
                Uuid::nil().into(), // tenant_id = nil (system-wide)
                "Inactivity Reminder".into(),
                serde_json::to_value(&trigger)
                    .unwrap_or(serde_json::Value::Null)
                    .into(),
                serde_json::to_value(&conditions)
                    .unwrap_or(serde_json::Value::Null)
                    .into(),
                serde_json::to_value(&actions)
                    .unwrap_or(serde_json::Value::Null)
                    .into(),
                true.into(),
                sea_orm::Value::String(None), // webhook_secret null
                now.into(),
                now.into(),
                0i32.into(),
            ],
        );
        db.execute_raw(stmt).await?;
        // tracing::info!("Inactivity reminder workflow inserted successfully");
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
