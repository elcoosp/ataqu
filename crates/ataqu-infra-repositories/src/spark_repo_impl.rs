use async_trait::async_trait;
use ataqu_domain_spark::repository::{SparkRepository, WorkflowRunRepository};
use ataqu_domain_spark::workflow::{WorkflowRun, WorkflowRunStatus};
use ataqu_domain_spark::{SparkError, Workflow};
use ataqu_kernel::TenantId;
use sea_orm::IntoActiveModel;
use sea_orm::entity::prelude::*;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set};
use uuid::Uuid;

mod workflow_entity {
    use sea_orm::entity::prelude::*;
    use serde::{Deserialize, Serialize};
    use serde_json::Value;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
    #[sea_orm(table_name = "workflows", schema_name = "collab_crm")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub name: String,
        pub trigger: Value,
        pub conditions: Value,
        pub actions: Value,
        pub is_active: bool,
        pub webhook_secret: Option<String>,
        pub created_at: chrono::DateTime<chrono::Utc>,
        pub updated_at: chrono::DateTime<chrono::Utc>,
        pub version: i32,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod workflow_run_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "workflow_runs", schema_name = "collab_crm")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub workflow_id: Uuid,
        pub status: String,
        pub payload: serde_json::Value,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod lease_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "leases", schema_name = "collab_crm")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub workflow_id: Uuid,
        pub fence_token: i64,
        pub holder: Option<String>,
        pub expires_at: Option<DateTime<Utc>>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub struct SparkRepositoryImpl {
    db: DatabaseConnection,
}

impl SparkRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn map_model_to_domain(model: workflow_entity::Model) -> Result<Workflow, SparkError> {
    Ok(Workflow {
        id: model.id,
        tenant_id: model.tenant_id,
        name: model.name,
        trigger: serde_json::from_value(model.trigger)
            .map_err(|e| SparkError::Database(e.to_string()))?,
        conditions: serde_json::from_value(model.conditions)
            .map_err(|e| SparkError::Database(e.to_string()))?,
        actions: serde_json::from_value(model.actions)
            .map_err(|e| SparkError::Database(e.to_string()))?,
        is_active: model.is_active,
        webhook_secret: model.webhook_secret,
        created_at: model.created_at.into(),
        updated_at: model.updated_at.into(),
        version: model.version,
    })
}

#[async_trait]
impl SparkRepository for SparkRepositoryImpl {
    async fn save_workflow(&self, workflow: &Workflow) -> Result<(), SparkError> {
        let active = workflow_entity::ActiveModel {
            id: Set(workflow.id),
            tenant_id: Set(workflow.tenant_id),
            name: Set(workflow.name.clone()),
            trigger: Set(serde_json::to_value(&workflow.trigger)
                .map_err(|e| SparkError::Database(e.to_string()))?),
            conditions: Set(serde_json::to_value(&workflow.conditions)
                .map_err(|e| SparkError::Database(e.to_string()))?),
            actions: Set(serde_json::to_value(&workflow.actions)
                .map_err(|e| SparkError::Database(e.to_string()))?),
            is_active: Set(workflow.is_active),
            webhook_secret: Set(workflow.webhook_secret.clone()),
            created_at: Set(workflow.created_at.into()),
            updated_at: Set(workflow.updated_at.into()),
            version: Set(workflow.version),
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

    async fn get_workflow(
        &self,
        tenant_id: &TenantId,
        id: &Uuid,
    ) -> Result<Option<Workflow>, SparkError> {
        let model = workflow_entity::Entity::find()
            .filter(workflow_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(workflow_entity::Column::Id.eq(*id))
            .one(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;

        match model {
            Some(m) => Ok(Some(map_model_to_domain(m)?)),
            None => Ok(None),
        }
    }

    async fn update_workflow(&self, workflow: &Workflow) -> Result<(), SparkError> {
        let active = workflow_entity::ActiveModel {
            id: Set(workflow.id),
            tenant_id: Set(workflow.tenant_id),
            name: Set(workflow.name.clone()),
            trigger: Set(serde_json::to_value(&workflow.trigger)
                .map_err(|e| SparkError::Database(e.to_string()))?),
            conditions: Set(serde_json::to_value(&workflow.conditions)
                .map_err(|e| SparkError::Database(e.to_string()))?),
            actions: Set(serde_json::to_value(&workflow.actions)
                .map_err(|e| SparkError::Database(e.to_string()))?),
            is_active: Set(workflow.is_active),
            webhook_secret: Set(workflow.webhook_secret.clone()),
            created_at: Set(workflow.created_at.into()),
            updated_at: Set(workflow.updated_at.into()),
            version: Set(workflow.version),
        };
        workflow_entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(())
    }

    async fn delete_workflow(&self, tenant_id: &TenantId, id: &Uuid) -> Result<(), SparkError> {
        workflow_entity::Entity::delete_many()
            .filter(workflow_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(workflow_entity::Column::Id.eq(*id))
            .exec(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(())
    }

    async fn count_workflows(&self, tenant_id: &TenantId) -> Result<u64, SparkError> {
        use workflow_entity as entity;
        let count = entity::Entity::find()
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .count(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(count)
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

        let mut workflows = Vec::new();
        for m in models {
            workflows.push(map_model_to_domain(m)?);
        }
        Ok(workflows)
    }

    async fn list_active_workflows_by_event_type(
        &self,
        schema: &str,
        event_type: &str,
    ) -> Result<Vec<Workflow>, SparkError> {
        let models = workflow_entity::Entity::find()
            .filter(workflow_entity::Column::IsActive.eq(true))
            .all(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;

        let mut workflows = Vec::new();
        for m in models {
            let wf = map_model_to_domain(m)?;
            let trigger_json = serde_json::to_value(&wf.trigger)
                .map_err(|e| SparkError::Database(e.to_string()))?;

            if let Some(t_obj) = trigger_json.as_object()
                && t_obj.get("schema").and_then(|v| v.as_str()) == Some(schema)
                && t_obj.get("event_type").and_then(|v| v.as_str()) == Some(event_type)
            {
                workflows.push(wf);
            }
        }
        Ok(workflows)
    }

    async fn list_active_scheduled_workflows(&self) -> Result<Vec<Workflow>, SparkError> {
        let models = workflow_entity::Entity::find()
            .filter(workflow_entity::Column::IsActive.eq(true))
            .all(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;

        let mut workflows = Vec::new();
        for m in models {
            let wf = map_model_to_domain(m)?;
            let trigger_json = serde_json::to_value(&wf.trigger)
                .map_err(|e| SparkError::Database(e.to_string()))?;
            if trigger_json.get("cron").is_some() {
                workflows.push(wf);
            }
        }
        Ok(workflows)
    }

    async fn get_workflow_lease(
        &self,
        tenant_id: &TenantId,
        workflow_id: &Uuid,
    ) -> Result<Option<ataqu_domain_spark::Lease>, SparkError> {
        use lease_entity as entity;
        let model = entity::Entity::find()
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(entity::Column::WorkflowId.eq(*workflow_id))
            .one(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(model.map(|m| ataqu_domain_spark::Lease {
            id: m.id,
            tenant_id: m.tenant_id,
            workflow_id: m.workflow_id,
            fence_token: m.fence_token as u64,
            holder: m.holder,
            expires_at: m.expires_at.map(|dt| dt),
            created_at: m.created_at,
            updated_at: m.updated_at,
        }))
    }

    async fn save_lease(&self, lease: &ataqu_domain_spark::Lease) -> Result<(), SparkError> {
        use lease_entity as entity;
        let active = entity::ActiveModel {
            id: Set(lease.id),
            tenant_id: Set(lease.tenant_id),
            workflow_id: Set(lease.workflow_id),
            fence_token: Set(lease.fence_token as i64),
            holder: Set(lease.holder.clone()),
            expires_at: Set(lease.expires_at.map(|dt| dt)),
            created_at: Set(lease.created_at),
            updated_at: Set(lease.updated_at),
        };
        entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(())
    }
}

// ============================================================================
// WorkflowRunRepository Implementation
// ============================================================================

pub struct WorkflowRunRepositoryImpl {
    db: DatabaseConnection,
}

impl WorkflowRunRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl WorkflowRunRepository for WorkflowRunRepositoryImpl {
    async fn create_run(&self, run: &WorkflowRun) -> Result<(), SparkError> {
        use workflow_run_entity as entity;
        let active = entity::ActiveModel {
            id: Set(run.id),
            tenant_id: Set(run.tenant_id),
            workflow_id: Set(run.workflow_id),
            status: Set(match &run.status {
                WorkflowRunStatus::Running => "running",
                WorkflowRunStatus::PendingApproval => "pending_approval",
                WorkflowRunStatus::Approved => "approved",
                WorkflowRunStatus::Rejected => "rejected",
                WorkflowRunStatus::Completed => "completed",
                WorkflowRunStatus::Failed => "failed",
            }
            .to_string()),
            payload: Set(run.payload.clone()),
            created_at: Set(run.created_at.into()),
            updated_at: Set(run.updated_at.into()),
        };
        entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(())
    }

    async fn update_run_status(
        &self,
        tenant_id: &TenantId,
        run_id: &Uuid,
        status: &WorkflowRunStatus,
    ) -> Result<(), SparkError> {
        use workflow_run_entity as entity;
        let status_str = match status {
            WorkflowRunStatus::Running => "running",
            WorkflowRunStatus::PendingApproval => "pending_approval",
            WorkflowRunStatus::Approved => "approved",
            WorkflowRunStatus::Rejected => "rejected",
            WorkflowRunStatus::Completed => "completed",
            WorkflowRunStatus::Failed => "failed",
        };
        let mut active = entity::Entity::find()
            .filter(entity::Column::Id.eq(*run_id))
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?
            .ok_or(SparkError::WorkflowNotFound)?
            .into_active_model();
        active.status = Set(status_str.to_string());
        active.updated_at = Set(chrono::Utc::now());
        entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(())
    }

    async fn get_run(
        &self,
        tenant_id: &TenantId,
        run_id: &Uuid,
    ) -> Result<Option<WorkflowRun>, SparkError> {
        use workflow_run_entity as entity;
        let model = entity::Entity::find()
            .filter(entity::Column::Id.eq(*run_id))
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;
        Ok(model.map(|m| WorkflowRun {
            id: m.id,
            tenant_id: m.tenant_id,
            workflow_id: m.workflow_id,
            status: match m.status.as_str() {
                "running" => WorkflowRunStatus::Running,
                "pending_approval" => WorkflowRunStatus::PendingApproval,
                "approved" => WorkflowRunStatus::Approved,
                "rejected" => WorkflowRunStatus::Rejected,
                "completed" => WorkflowRunStatus::Completed,
                "failed" => WorkflowRunStatus::Failed,
                _ => WorkflowRunStatus::Running,
            },
            payload: m.payload,
            created_at: m.created_at.into(),
            updated_at: m.updated_at.into(),
        }))
    }

    async fn list_runs(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<WorkflowRun>, SparkError> {
        use workflow_run_entity as entity;
        let models = entity::Entity::find()
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .order_by_desc(entity::Column::CreatedAt)
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| SparkError::Database(e.to_string()))?;

        Ok(models
            .into_iter()
            .map(|m| WorkflowRun {
                id: m.id,
                tenant_id: m.tenant_id,
                workflow_id: m.workflow_id,
                status: match m.status.as_str() {
                    "running" => WorkflowRunStatus::Running,
                    "pending_approval" => WorkflowRunStatus::PendingApproval,
                    "approved" => WorkflowRunStatus::Approved,
                    "rejected" => WorkflowRunStatus::Rejected,
                    "completed" => WorkflowRunStatus::Completed,
                    "failed" => WorkflowRunStatus::Failed,
                    _ => WorkflowRunStatus::Running,
                },
                payload: m.payload,
                created_at: m.created_at.into(),
                updated_at: m.updated_at.into(),
            })
            .collect())
    }
}
