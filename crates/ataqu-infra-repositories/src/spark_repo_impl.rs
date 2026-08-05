use async_trait::async_trait;
use ataqu_domain_spark::errors::SparkError;
use ataqu_domain_spark::lease::Lease;
use ataqu_domain_spark::repository::SparkRepository;
use ataqu_domain_spark::workflow::Workflow;
use ataqu_domain_spark::{Action, Condition, Trigger};
use ataqu_kernel::TenantId;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, Set};
use uuid::Uuid;

use crate::entities::spark::lease as lease_entity;
use crate::entities::spark::workflow as workflow_entity;

pub struct SparkRepositoryImpl {
    db: DatabaseConnection,
}

impl SparkRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn workflow_model_to_domain(model: workflow_entity::Model) -> Workflow {
    let def = model.definition;

    let trigger =
        serde_json::from_value(def.get("trigger").cloned().unwrap_or(serde_json::json!({})))
            .unwrap_or(Trigger::Event {
                event_type: "unknown".to_string(),
            });

    let conditions: Vec<Condition> = serde_json::from_value(
        def.get("conditions")
            .cloned()
            .unwrap_or(serde_json::json!([])),
    )
    .unwrap_or_default();

    let actions: Vec<Action> =
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
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(model.map(workflow_model_to_domain))
    }

    async fn save_workflow(&self, workflow: &Workflow) -> Result<(), SparkError> {
        let definition = serde_json::json!({
            "trigger": workflow.trigger,
            "conditions": workflow.conditions,
            "actions": workflow.actions,
        });

        let active = workflow_entity::ActiveModel {
            id: Set(workflow.id),
            tenant_id: Set(workflow.tenant_id),
            name: Set(workflow.name.clone()),
            definition: Set(definition),
            enabled: Set(workflow.is_active),
            created_at: Set(workflow.created_at.into()),
            updated_at: Set(workflow.updated_at.into()),
        };

        let exists = workflow_entity::Entity::find_by_id(workflow.id)
            .one(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?
            .is_some();

        if exists {
            workflow_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| SparkError::Database(e.to_string()))?;
        } else {
            workflow_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| SparkError::Database(e.to_string()))?;
        }
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
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(models.into_iter().map(workflow_model_to_domain).collect())
    }

    async fn list_active_workflows_by_event_type(
        &self,
        _schema: &str,
        event_type: &str,
    ) -> Result<Vec<Workflow>, SparkError> {
        let models = workflow_entity::Entity::find()
            .filter(workflow_entity::Column::Enabled.eq(true))
            .all(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;

        let workflows: Vec<Workflow> = models.into_iter().map(workflow_model_to_domain).collect();

        Ok(workflows
            .into_iter()
            .filter(|w| {
                if let Trigger::Event { event_type: et } = &w.trigger {
                    et == event_type
                } else {
                    false
                }
            })
            .collect())
    }

    async fn list_active_scheduled_workflows(&self) -> Result<Vec<Workflow>, SparkError> {
        let models = workflow_entity::Entity::find()
            .filter(workflow_entity::Column::Enabled.eq(true))
            .all(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;

        let workflows: Vec<Workflow> = models.into_iter().map(workflow_model_to_domain).collect();
        Ok(workflows
            .into_iter()
            .filter(|w| matches!(w.trigger, Trigger::Schedule { .. }))
            .collect())
    }

    async fn get_workflow_lease(
        &self,
        tenant_id: &TenantId,
        workflow_id: &Uuid,
    ) -> Result<Option<Lease>, SparkError> {
        let model = lease_entity::Entity::find()
            .filter(lease_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(lease_entity::Column::WorkflowId.eq(*workflow_id))
            .one(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;

        Ok(model.map(|m| Lease {
            id: m.id,
            tenant_id: m.tenant_id,
            workflow_id: m.workflow_id,
            fence_token: m.fence_token as u64,
            holder: m.holder,
            expires_at: m.expires_at,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }))
    }

    async fn save_lease(&self, lease: &Lease) -> Result<(), SparkError> {
        let active = lease_entity::ActiveModel {
            id: Set(lease.id),
            tenant_id: Set(lease.tenant_id),
            workflow_id: Set(lease.workflow_id),
            fence_token: Set(lease.fence_token as i64),
            holder: Set(lease.holder.clone()),
            expires_at: Set(lease.expires_at),
            created_at: Set(lease.created_at),
            updated_at: Set(lease.updated_at),
        };

        let exists = lease_entity::Entity::find_by_id(lease.id)
            .one(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?
            .is_some();

        if exists {
            lease_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| SparkError::Database(e.to_string()))?;
        } else {
            lease_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| SparkError::Database(e.to_string()))?;
        }
        Ok(())
    }
}
