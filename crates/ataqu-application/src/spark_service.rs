use std::sync::Arc;

use ataqu_domain_spark::repository::SparkRepository;
use ataqu_domain_spark::{Action, Condition, SparkError, Trigger, Workflow, evaluate_conditions};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_infra_outbox::OutboxEvent;
use uuid::Uuid;

#[async_trait::async_trait]
pub trait ActionDispatcher: Send + Sync {
    async fn dispatch(&self, action: &Action, tenant_id: &TenantId) -> Result<(), String>;
}

#[derive(Debug, Clone)]
pub struct CreateWorkflowCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub trigger: Trigger,
    pub conditions: Vec<Condition>,
    pub actions: Vec<Action>,
}

#[derive(Debug, Clone)]
pub struct TriggerWorkflowCommand {
    pub tenant_id: TenantId,
    pub workflow_id: Uuid,
    pub payload: serde_json::Value,
}

#[derive(Debug, thiserror::Error)]
pub enum SparkServiceError {
    #[error("Workflow not found")]
    WorkflowNotFound,
    #[error("Conditions not satisfied")]
    ConditionsNotSatisfied,
    #[error("Repository error: {0}")]
    Repository(String),
    #[error("Domain error: {0}")]
    Domain(#[from] SparkError),
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type SparkResult<T> = Result<T, SparkServiceError>;

pub struct SparkService {
    repo: Arc<dyn SparkRepository + Send + Sync>,
    dispatcher: Arc<dyn ActionDispatcher + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl SparkService {
    pub fn new(
        repo: Arc<dyn SparkRepository + Send + Sync>,
        dispatcher: Arc<dyn ActionDispatcher + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self { repo, dispatcher, id_gen, clock }
    }

    pub async fn create_workflow(&self, cmd: CreateWorkflowCommand) -> SparkResult<Workflow> {
        let domain_cmd = ataqu_domain_spark::CreateWorkflowCommand {
            tenant_id: cmd.tenant_id.as_uuid(),
            name: cmd.name,
            trigger: cmd.trigger,
            conditions: cmd.conditions,
            actions: cmd.actions,
        };
        let (workflow, _) = ataqu_domain_spark::create_workflow(
            domain_cmd,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        )?;
        self.repo.save_workflow(&workflow).await?;
        Ok(workflow)
    }

    pub async fn get_workflow(&self, tenant_id: TenantId, id: Uuid) -> SparkResult<Workflow> {
        self.repo.get_workflow(&tenant_id, &id).await?
            .ok_or(SparkServiceError::WorkflowNotFound)
    }

    pub async fn list_workflows(&self, tenant_id: TenantId, limit: u64, offset: u64) -> SparkResult<Vec<Workflow>> {
        Ok(self.repo.list_workflows(&tenant_id, limit, offset).await?)
    }

    pub async fn trigger_workflow(&self, cmd: TriggerWorkflowCommand) -> SparkResult<()> {
        let workflow = self.get_workflow(cmd.tenant_id, cmd.workflow_id).await?;
        if !evaluate_conditions(&workflow.conditions, &cmd.payload) {
            return Err(SparkServiceError::ConditionsNotSatisfied);
        }
        self.execute_workflow(&workflow).await?;
        Ok(())
    }

    pub async fn trigger_workflow_public(&self, workflow_id: Uuid, payload: serde_json::Value) -> SparkResult<()> {
        // In a real system, we would have a repo method to find by ID across tenants or validate a webhook secret
        // For now, we assume the workflow_id is enough to find it, and we extract the tenant_id from it.
        let workflows = self.repo.list_workflows(&ataqu_kernel::TenantId::new(Uuid::nil()), 10000, 0).await?;
        let workflow = workflows.into_iter().find(|w| w.id == workflow_id)
            .ok_or(SparkServiceError::WorkflowNotFound)?;

        if !evaluate_conditions(&workflow.conditions, &payload) {
            return Err(SparkServiceError::ConditionsNotSatisfied);
        }
        self.execute_workflow(&workflow).await?;
        Ok(())
    }

    pub async fn evaluate_trigger(&self, event: &OutboxEvent) -> SparkResult<()> {
        let workflows = self.repo.list_active_workflows_by_event_type(&event.schema, &event.event_type).await?;
        for workflow in workflows {
            if evaluate_conditions(&workflow.conditions, &event.payload) {
                if let Err(e) = self.execute_workflow(&workflow).await {
                    tracing::error!(error = %e, "Failed to execute workflow {}", workflow.id);
                }
            }
        }
        Ok(())
    }

    async fn execute_workflow(&self, workflow: &Workflow) -> SparkResult<()> {
        let tenant_id = TenantId::new(workflow.tenant_id);
        for action in &workflow.actions {
            if let Err(e) = self.dispatcher.dispatch(action, &tenant_id).await {
                tracing::error!(error = %e, "Failed to dispatch action");
            }
        }
        Ok(())
    }
}
