use std::sync::Arc;

use ataqu_domain_spark::repository::SparkRepository;
use ataqu_domain_spark::{Action, Condition, SparkError, Trigger, Workflow, evaluate_conditions};
use ataqu_infra_outbox::OutboxEvent;
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use uuid::Uuid;

use crate::outbox::Outbox;

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
    pub webhook_secret: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UpdateWorkflowCommand {
    pub tenant_id: TenantId,
    pub id: Uuid,
    pub name: Option<String>,
    pub is_active: Option<bool>,
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
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl SparkService {
    pub fn new(
        repo: Arc<dyn SparkRepository + Send + Sync>,
        dispatcher: Arc<dyn ActionDispatcher + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            repo,
            dispatcher,
            outbox,
            id_gen,
            clock,
        }
    }

    pub async fn create_workflow(&self, cmd: CreateWorkflowCommand) -> SparkResult<Workflow> {
        let domain_cmd = ataqu_domain_spark::CreateWorkflowCommand {
            tenant_id: cmd.tenant_id.as_uuid(),
            name: cmd.name,
            trigger: cmd.trigger,
            conditions: cmd.conditions,
            actions: cmd.actions,
            webhook_secret: cmd.webhook_secret,
        };
        let (workflow, _) = ataqu_domain_spark::create_workflow(
            domain_cmd,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        )?;
        self.repo.save_workflow(&workflow).await?;

        let payload = serde_json::json!({
            "workflow_id": workflow.id,
            "tenant_id": workflow.tenant_id,
            "name": workflow.name,
        });
        self.outbox
            .append("collab_crm", "WorkflowCreated", workflow.id, &payload)
            .await
            .map_err(|e| SparkServiceError::Repository(e))?;

        Ok(workflow)
    }

    pub async fn get_workflow(&self, tenant_id: TenantId, id: Uuid) -> SparkResult<Workflow> {
        self.repo
            .get_workflow(&tenant_id, &id)
            .await?
            .ok_or(SparkServiceError::WorkflowNotFound)
    }

    pub async fn update_workflow(
        &self,
        cmd: UpdateWorkflowCommand,
        expected_version: i32,
    ) -> SparkResult<Workflow> {
        let mut workflow = self.get_workflow(cmd.tenant_id, cmd.id).await?;
        if workflow.version != expected_version {
            return Err(SparkServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, workflow.version
            )));
        }
        if let Some(name) = cmd.name {
            workflow.name = name;
        }
        if let Some(is_active) = cmd.is_active {
            workflow.is_active = is_active;
        }
        workflow.updated_at = self.clock.now();
        workflow.version += 1;
        self.repo.update_workflow(&workflow).await?;
        Ok(workflow)
    }

    pub async fn delete_workflow(&self, tenant_id: TenantId, id: Uuid) -> SparkResult<()> {
        self.repo.delete_workflow(&tenant_id, &id).await?;
        Ok(())
    }

    pub async fn list_workflows(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> SparkResult<Vec<Workflow>> {
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

    pub async fn trigger_workflow_public(
        &self,
        tenant_id: TenantId,
        workflow_id: Uuid,
        payload: serde_json::Value,
        webhook_secret: Option<String>,
    ) -> SparkResult<()> {
        let workflow = self
            .repo
            .get_workflow(&tenant_id, &workflow_id)
            .await?
            .ok_or(SparkServiceError::WorkflowNotFound)?;

        if let Some(expected_secret) = &workflow.webhook_secret {
            match webhook_secret {
                Some(provided) if provided == *expected_secret => {}
                _ => {
                    return Err(SparkServiceError::Validation(
                        "Invalid or missing webhook secret".to_string(),
                    ));
                }
            }
        }

        if !evaluate_conditions(&workflow.conditions, &payload) {
            return Err(SparkServiceError::ConditionsNotSatisfied);
        }
        self.execute_workflow(&workflow).await?;
        Ok(())
    }

    pub async fn evaluate_trigger(&self, event: &OutboxEvent) -> SparkResult<()> {
        let workflows = self
            .repo
            .list_active_workflows_by_event_type(&event.schema, &event.event_type)
            .await?;
        let event_tenant_id = match event
            .payload
            .get("tenant_id")
            .and_then(|v| {
                if let serde_json::Value::String(s) = v {
                    Uuid::parse_str(s).ok()
                } else {
                    None
                }
            })
        {
            Some(id) => id,
            None => {
                tracing::warn!(event_type = %event.event_type, "Outbox event missing tenant_id in payload. Skipping.");
                return Ok(());
            }
        };
        for workflow in workflows {
            if workflow.tenant_id != event_tenant_id {
                continue;
            }
            if evaluate_conditions(&workflow.conditions, &event.payload) {
                if let Err(e) = self.execute_workflow(&workflow).await {
                    tracing::error!(error = %e, "Failed to execute workflow {}", workflow.id);
                }
            }
        }
        Ok(())
    }

    pub async fn poll_scheduled_triggers(&self) -> SparkResult<()> {
        let workflows = self.repo.list_active_scheduled_workflows().await?;
        let now: chrono::DateTime<chrono::Utc> = self.clock.now().into();

        for workflow in workflows {
            if let Trigger::Schedule { cron } = &workflow.trigger {
                if let Ok(cron_job) = croner::Cron::new(cron).parse() {
                    // Find the previous occurrence to see if we missed it
                    if let Ok(prev_run) = cron_job.find_next_occurrence(&(now - chrono::Duration::seconds(60)), false) {
                        if prev_run <= now {
                            tracing::info!("Triggering scheduled workflow {}", workflow.id);
                            let payload = serde_json::json!({ "time": now.to_rfc3339() });
                            if evaluate_conditions(&workflow.conditions, &payload) {
                                if let Err(e) = self.execute_workflow(&workflow).await {
                                    tracing::error!(error = %e, "Failed to execute scheduled workflow {}", workflow.id);
                                }
                            }
                        }
                    }
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
