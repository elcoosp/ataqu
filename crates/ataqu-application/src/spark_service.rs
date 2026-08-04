//! SPARK application service – orchestrates workflows using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_domain_spark::{Workflow, Action, Trigger, Condition, SparkError, evaluate_conditions};
use ataqu_domain_spark::repository::SparkRepository;


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
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl SparkService {
    pub fn new(
        repo: Arc<dyn SparkRepository + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self { repo, id_gen, clock }
    }

    pub async fn create_workflow(&self, cmd: CreateWorkflowCommand) -> SparkResult<Workflow> {
        let domain_cmd = ataqu_domain_spark::CreateWorkflowCommand {
            tenant_id: cmd.tenant_id.as_uuid(),
            name: cmd.name,
            trigger: cmd.trigger,
            conditions: cmd.conditions,
            actions: cmd.actions,
        };
        let (workflow, _) = ataqu_domain_spark::create_workflow(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(SparkServiceError::Domain)?;
        self.repo.save_workflow(&workflow).await.map_err(|e| SparkServiceError::Repository(e.to_string()))?;
        Ok(workflow)
    }

    pub async fn get_workflow(&self, tenant_id: TenantId, id: Uuid) -> SparkResult<Workflow> {
        self.repo.get_workflow(&tenant_id, &id).await
            .map_err(|e| SparkServiceError::Repository(e.to_string()))?
            .ok_or(SparkServiceError::WorkflowNotFound)
    }

    pub async fn list_workflows(&self, tenant_id: TenantId, limit: u64, offset: u64) -> SparkResult<Vec<Workflow>> {
        self.repo.list_workflows(&tenant_id, limit, offset).await
            .map_err(|e| SparkServiceError::Repository(e.to_string()))
    }

    pub async fn trigger_workflow(&self, cmd: TriggerWorkflowCommand) -> SparkResult<()> {
        let workflow = self.get_workflow(cmd.tenant_id, cmd.workflow_id).await?;
        // Evaluate conditions against payload
        if !evaluate_conditions(&workflow.conditions, &cmd.payload) {
            return Err(SparkServiceError::ConditionsNotSatisfied);
        }
        // Acquire lease and dispatch actions (with fence token 0 for first execution)
        // In a real implementation, we'd get the current fence token from the lease.
        // For simplicity, we'll use 0 as expected token; the repo will handle it.
        self.repo.acquire_lease_and_dispatch(&cmd.tenant_id, &cmd.workflow_id, 0, &workflow.actions).await
            .map_err(|e| SparkServiceError::Repository(e.to_string()))?;
        Ok(())
    }
}
