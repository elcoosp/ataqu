//! SeaORM implementations for SPARK domain repository.
use async_trait::async_trait;
use chrono::Utc;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, DbBackend, EntityTrait, QueryFilter,
    QuerySelect, Set, Statement,
};
use uuid::Uuid;

use ataqu_domain_spark::action::Action;
use ataqu_domain_spark::errors::SparkError;
use ataqu_domain_spark::repository::SparkRepository;
use ataqu_domain_spark::workflow::Workflow;
use ataqu_kernel::TenantId;

use crate::entities::spark::lease as lease_entity;
use crate::entities::spark::workflow as workflow_entity;

// ---------- Helpers ----------
fn workflow_to_model(workflow: &Workflow) -> workflow_entity::ActiveModel {
    let definition = serde_json::json!({
        "trigger": workflow.trigger,
        "conditions": workflow.conditions,
        "actions": workflow.actions,
    });
    workflow_entity::ActiveModel {
        id: Set(workflow.id),
        tenant_id: Set(workflow.tenant_id),
        name: Set(workflow.name.clone()),
        definition: Set(definition),
        enabled: Set(workflow.is_active),
        created_at: Set(workflow.created_at.into()),
        updated_at: Set(workflow.updated_at.into()),
    }
}

fn model_to_workflow(model: workflow_entity::Model) -> Workflow {
    let def = model.definition;
    let trigger: ataqu_domain_spark::Trigger =
        serde_json::from_value(def.get("trigger").cloned().unwrap_or(serde_json::json!({})))
            .unwrap_or(ataqu_domain_spark::Trigger::Webhook {
                path: "/default".to_string(),
            });
    let conditions: Vec<ataqu_domain_spark::Condition> = serde_json::from_value(
        def.get("conditions")
            .cloned()
            .unwrap_or(serde_json::json!([])),
    )
    .unwrap_or_default();
    let actions: Vec<ataqu_domain_spark::Action> =
        serde_json::from_value(def.get("actions").cloned().unwrap_or(serde_json::json!([])))
            .unwrap_or_default();
    Workflow {
        id: model.id,
        tenant_id: model.tenant_id,
        name: model.name,
        trigger,
        conditions,
        actions,
        is_active: model.enabled,
        created_at: model.created_at.into(),
        updated_at: model.updated_at.into(),
    }
}

pub struct SparkRepositoryImpl {
    db: DatabaseConnection,
}

impl SparkRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl SparkRepository for SparkRepositoryImpl {
    async fn get_workflow(
        &self,
        tenant_id: &TenantId,
        workflow_id: &Uuid,
    ) -> Result<Option<Workflow>, SparkError> {
        let model = workflow_entity::Entity::find()
            .filter(workflow_entity::Column::Id.eq(*workflow_id))
            .filter(workflow_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|_| SparkError::WorkflowNotFound)?;
        Ok(model.map(model_to_workflow))
    }

    async fn save_workflow(&self, workflow: &Workflow) -> Result<(), SparkError> {
        let active = workflow_to_model(workflow);
        workflow_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|_| SparkError::WorkflowNotFound)?;
        Ok(())
    }

    async fn list_workflows(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Workflow>, SparkError> {
        let models = workflow_entity::Entity::find()
            .filter(workflow_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|_| SparkError::WorkflowNotFound)?;
        Ok(models.into_iter().map(model_to_workflow).collect())
    }

    async fn acquire_lease_and_dispatch(
        &self,
        tenant_id: &TenantId,
        workflow_id: &Uuid,
        expected_token: u64,
        actions: &[Action],
    ) -> Result<(), SparkError> {
        // Check if lease exists
        let existing = lease_entity::Entity::find()
            .filter(lease_entity::Column::WorkflowId.eq(*workflow_id))
            .filter(lease_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|_| SparkError::WorkflowNotFound)?;

        let now = Utc::now();
        let expires_at = now + chrono::Duration::hours(1);

        if let Some(_lease) = existing {
            // Update lease atomically
            // We'll use raw SQL to avoid complex SeaORM expressions
            let sql = r#"
                UPDATE collab_crm.leases
                SET fence_token = fence_token + 1,
                    updated_at = $1,
                    expires_at = $2
                WHERE workflow_id = $3
                  AND tenant_id = $4
                  AND fence_token = $5
            "#;
            let stmt = Statement::from_sql_and_values(
                DbBackend::Postgres,
                sql,
                vec![
                    now.into(),
                    expires_at.into(),
                    (*workflow_id).into(),
                    (tenant_id.as_uuid()).into(),
                    (expected_token as i64).into(),
                ],
            );
            let res = self
                .db
                .execute_raw(stmt)
                .await
                .map_err(|_| SparkError::WorkflowNotFound)?;
            if res.rows_affected() == 0 {
                return Err(SparkError::WorkflowNotFound);
            }
        } else {
            // Insert new lease with fence_token = 1
            let new_lease = lease_entity::ActiveModel {
                id: Set(Uuid::new_v4()),
                tenant_id: Set(tenant_id.as_uuid()),
                workflow_id: Set(*workflow_id),
                fence_token: Set(1),
                holder: Set(None),
                expires_at: Set(expires_at),
                created_at: Set(now),
                updated_at: Set(now),
            };
            lease_entity::Entity::insert(new_lease)
                .exec(&self.db)
                .await
                .map_err(|_| SparkError::WorkflowNotFound)?;
        }

        // Dispatch actions to outbox
        for action in actions {
            let payload = serde_json::json!({
                "action": action,
                "workflow_id": workflow_id,
                "tenant_id": tenant_id.as_uuid(),
                "timestamp": now,
            });
            let outbox_sql = r#"
                INSERT INTO core.outbox (schema, event_type, aggregate_id, payload, status, priority)
                VALUES ('spark', 'ActionExecuted', $1, $2, 'pending', 'normal')
            "#;
            let stmt = Statement::from_sql_and_values(
                DbBackend::Postgres,
                outbox_sql,
                vec![(*workflow_id).into(), payload.into()],
            );
            self.db
                .execute_raw(stmt)
                .await
                .map_err(|_| SparkError::WorkflowNotFound)?;
        }

        // Notify dispatcher
        let notify = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT pg_notify('outbox_event', '')",
            vec![],
        );
        self.db
            .execute_raw(notify)
            .await
            .map_err(|_| SparkError::WorkflowNotFound)?;

        Ok(())
    }
}
