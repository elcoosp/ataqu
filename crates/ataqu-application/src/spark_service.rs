#![allow(unused_variables)]
use std::sync::Arc;

use ataqu_domain_spark::repository::{
    SparkRepository, WorkflowRun, WorkflowRunRepository, WorkflowRunStatus,
};
use ataqu_domain_spark::{Action, Condition, SparkError, Trigger, Workflow, evaluate_conditions};
use ataqu_infra_outbox::OutboxEvent;
use ataqu_infra_repositories::pending_approval_repo::{
	PendingApproval, PendingApprovalRepository,
};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::{DateTime, Utc};
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
    run_repo: Option<Arc<dyn WorkflowRunRepository + Send + Sync>>,
    approval_repo: Option<Arc<dyn PendingApprovalRepository + Send + Sync>>,
    dispatcher: Arc<dyn ActionDispatcher + Send + Sync>,
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
    audit_repo: Option<Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>>,
}

impl SparkService {
    pub fn new(
        repo: Arc<dyn SparkRepository + Send + Sync>,
        dispatcher: Arc<dyn ActionDispatcher + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
        audit_repo: Option<
            Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>,
        >,
    ) -> Self {
        Self {
            repo,
            run_repo: None,
            approval_repo: None,
            dispatcher,
            outbox,
            id_gen,
            clock,
            audit_repo,
        }
    }

    pub fn with_approval_repo(
        mut self,
        approval_repo: Arc<dyn PendingApprovalRepository + Send + Sync>,
    ) -> Self {
        self.approval_repo = Some(approval_repo);
        self
    }

    /// Attach the workflow-run repository so runs can be tracked and paused for approval.
    #[must_use]
    pub fn with_workflow_run_repository(
        mut self,
        run_repo: Arc<dyn WorkflowRunRepository + Send + Sync>,
    ) -> Self {
        self.run_repo = Some(run_repo);
        self
    }

    pub fn with_approval_repository(
        mut self,
        approval_repo: Arc<dyn PendingApprovalRepository + Send + Sync>,
    ) -> Self {
        self.approval_repo = Some(approval_repo);
        self
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
            .map_err(SparkServiceError::Repository)?;

        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    ataqu_kernel::TenantId::new(workflow.tenant_id),
                    Uuid::nil(),
                    "create_workflow",
                    "spark",
                    Some("workflow"),
                    Some(workflow.id),
                    None,
                    Some(serde_json::json!({"name": workflow.name})),
                    None,
                    None,
                )
                .await
                .ok();
        }

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
    ) -> SparkResult<(Vec<Workflow>, u64)> {
        let total = self.repo.count_workflows(&tenant_id).await?;
        let workflows = self.repo.list_workflows(&tenant_id, limit, offset).await?;
        Ok((workflows, total))
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
        let event_tenant_id = match event.payload.get("tenant_id").and_then(|v| {
            if let serde_json::Value::String(s) = v {
                Uuid::parse_str(s).ok()
            } else {
                None
            }
        }) {
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
            if evaluate_conditions(&workflow.conditions, &event.payload)
                && let Err(e) = self.execute_workflow(&workflow).await
            {
                tracing::error!(error = %e, "Failed to execute workflow {}", workflow.id);
            }
        }
        Ok(())
    }

    pub async fn poll_scheduled_triggers(&self) -> SparkResult<()> {
        let workflows = self.repo.list_active_scheduled_workflows().await?;
        let now: chrono::DateTime<chrono::Utc> = self.clock.now().into();

        for workflow in workflows {
            if let Trigger::Schedule { cron } = &workflow.trigger
                && let Ok(cron_job) = croner::Cron::new(cron).parse()
            {
                // Find the previous occurrence to see if we missed it in the last 60 seconds
                if let Ok(prev_run) =
                    cron_job.find_next_occurrence(&(now - chrono::Duration::seconds(3600)), false)
                    && prev_run <= now
                {
                    tracing::info!("Triggering scheduled workflow {}", workflow.id);
                    let payload = serde_json::json!({
                        "workflow_id": workflow.id,
                        "trigger_time": now.to_rfc3339(),
                    });
                    if evaluate_conditions(&workflow.conditions, &payload)
                        && let Err(e) = self.execute_workflow(&workflow).await
                    {
                        tracing::error!(error = %e, "Failed to execute scheduled workflow {}", workflow.id);
                    }
                }
            }
        }
        Ok(())
    }

    pub async fn approve_workflow_run(
        &self,
        tenant_id: TenantId,
        run_id: Uuid,
        approved_by: Uuid,
    ) -> SparkResult<()> {
        let Some(run_repo) = self.run_repo.as_ref() else {
            return Err(SparkServiceError::Repository(
                "Workflow run repository not configured".to_string(),
            ));
        };
        let run = run_repo
            .get_run(&tenant_id, &run_id)
            .await?
            .ok_or(SparkServiceError::WorkflowNotFound)?;
        if run.status != WorkflowRunStatus::PendingApproval {
            return Err(SparkServiceError::Validation(format!(
                "Workflow run {run_id} is not pending approval"
            )));
        }

        // Mark the pending approval record as approved by the acting user.
        if let Some(approval_repo) = self.approval_repo.as_ref()
            && let Some(approval) = approval_repo
                .find_by_run_id(tenant_id, run_id)
                .await
                .map_err(SparkServiceError::Repository)?
            {
                approval_repo
                    .approve(approval.id, approved_by)
                    .await
                    .map_err(SparkServiceError::Repository)?;
            }

        let workflow = self
            .repo
            .get_workflow(&tenant_id, &run.workflow_id)
            .await?
            .ok_or(SparkServiceError::WorkflowNotFound)?;
        run_repo
            .update_run_status(&tenant_id, &run_id, &WorkflowRunStatus::Approved)
            .await?;
        let resume_index = workflow
            .actions
            .iter()
            .position(|action| matches!(action, Action::RequestApproval { .. }))
            .map(|index| index + 1)
            .unwrap_or(0);
        self.execute_actions_from(&workflow, run_repo, &run, resume_index)
            .await?;
        Ok(())
    }

    /// Reject a workflow run that is pending approval.
    ///
    /// Marks the `pending_approvals` row as `rejected` (recorded against the acting
    /// user) and sets the workflow run status to `Rejected`. The run is not resumed.
    pub async fn reject_workflow_run(
        &self,
        tenant_id: TenantId,
        run_id: Uuid,
        rejected_by: Uuid,
    ) -> SparkResult<()> {
        let Some(run_repo) = self.run_repo.as_ref() else {
            return Err(SparkServiceError::Repository(
                "Workflow run repository not configured".to_string(),
            ));
        };
        let run = run_repo
            .get_run(&tenant_id, &run_id)
            .await?
            .ok_or(SparkServiceError::WorkflowNotFound)?;
        if run.status != WorkflowRunStatus::PendingApproval {
            return Err(SparkServiceError::Validation(format!(
                "Workflow run {run_id} is not pending approval"
            )));
        }

        // Mark the pending approval record as rejected by the acting user.
        if let Some(approval_repo) = self.approval_repo.as_ref()
            && let Some(approval) = approval_repo
                .find_by_run_id(tenant_id, run_id)
                .await
                .map_err(SparkServiceError::Repository)?
            {
                approval_repo
                    .reject(approval.id, rejected_by)
                    .await
                    .map_err(SparkServiceError::Repository)?;
            }

        run_repo
            .update_run_status(&tenant_id, &run_id, &WorkflowRunStatus::Rejected)
            .await?;
        tracing::info!(workflow_id = %run.workflow_id, run_id = %run_id, "Workflow run rejected");
        Ok(())
    }

    /// List pending approvals for a tenant (surfaced in the approvals UI).
    pub async fn list_pending_approvals(
        &self,
        tenant_id: TenantId,
        limit: u64,
    ) -> SparkResult<Vec<PendingApproval>> {
        let Some(approval_repo) = self.approval_repo.as_ref() else {
            return Ok(Vec::new());
        };
        approval_repo
            .find_pending(tenant_id, limit)
            .await
            .map_err(SparkServiceError::Repository)
    }

    /// List workflow runs for a tenant, newest first, paginated.
    pub async fn list_runs(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> SparkResult<Vec<WorkflowRun>> {
        let Some(run_repo) = self.run_repo.as_ref() else {
            return Err(SparkServiceError::Repository(
                "Workflow run repository not configured".to_string(),
            ));
        };
        Ok(run_repo
            .list_runs(&tenant_id, limit, offset)
            .await?)
    }

    /// Fetch a single workflow run by id.
    pub async fn get_run(
        &self,
        tenant_id: TenantId,
        run_id: Uuid,
    ) -> SparkResult<WorkflowRun> {
        let Some(run_repo) = self.run_repo.as_ref() else {
            return Err(SparkServiceError::Repository(
                "Workflow run repository not configured".to_string(),
            ));
        };
        run_repo
            .get_run(&tenant_id, &run_id)
            .await?
            .ok_or(SparkServiceError::WorkflowNotFound)
    }

    async fn execute_workflow(&self, workflow: &Workflow) -> SparkResult<Uuid> {
        let Some(run_repo) = self.run_repo.as_ref() else {
            self.dispatch_actions_without_run_tracking(workflow).await;
            return Ok(Uuid::nil());
        };
        let run_id = self.id_gen.new_uuid_v7();
        let now = self.clock.now();
        let run = WorkflowRun {
            id: run_id,
            tenant_id: workflow.tenant_id,
            workflow_id: workflow.id,
            status: WorkflowRunStatus::Running,
            payload: serde_json::json!({}),
            created_at: now,
            updated_at: now,
        };
        run_repo.create_run(&run).await?;
        self.execute_actions_from(workflow, run_repo, &run, 0)
            .await?;
        Ok(run_id)
    }

    async fn dispatch_actions_without_run_tracking(&self, workflow: &Workflow) {
        let tenant_id = TenantId::new(workflow.tenant_id);
        for action in &workflow.actions {
            if let Err(e) = self.dispatcher.dispatch(action, &tenant_id).await {
                tracing::error!(error = %e, workflow_id = %workflow.id, "Failed to dispatch workflow action");
            }
        }
    }

    async fn execute_actions_from(
        &self,
        workflow: &Workflow,
        run_repo: &Arc<dyn WorkflowRunRepository + Send + Sync>,
        run: &WorkflowRun,
        start_index: usize,
    ) -> SparkResult<()> {
        let tenant_id = TenantId::new(workflow.tenant_id);
        for (index, action) in workflow.actions.iter().enumerate().skip(start_index) {
            if let Action::RequestApproval { approver_role } = action {
                run_repo
                    .update_run_status(&tenant_id, &run.id, &WorkflowRunStatus::PendingApproval)
                    .await?;
                // Surface the pending item so approvers get notified by the
                // approval worker and can act on it via the API.
                if let Some(approval_repo) = &self.approval_repo {
                    let now = DateTime::<Utc>::from(self.clock.now());
                    let approval = PendingApproval {
                        id: self.id_gen.new_uuid_v7(),
                        tenant_id,
                        workflow_id: workflow.id,
                        run_id: run.id,
                        approver_role: approver_role.clone(),
                        status: "pending".to_string(),
                        payload: serde_json::json!({
                            "workflow_id": workflow.id,
                            "run_id": run.id,
                            "approver_role": approver_role,
                        }),
                        approved_by: None,
                        approved_at: None,
                        created_at: now,
                        updated_at: now,
                    };
                    if let Err(e) = approval_repo.create(&approval).await {
                        tracing::error!(error = %e, run_id = %run.id, "Failed to record pending approval");
                    }
                }
                tracing::info!(
                    workflow_id = %workflow.id,
                    run_id = %run.id,
                    action_index = index,
                    "Workflow run paused pending approval"
                );
                return Ok(());
            }
            if let Err(e) = self.dispatcher.dispatch(action, &tenant_id).await {
                tracing::error!(error = %e, workflow_id = %workflow.id, action_index = index, "Failed to dispatch workflow action");
                run_repo
                    .update_run_status(&tenant_id, &run.id, &WorkflowRunStatus::Failed)
                    .await?;
                return Err(SparkServiceError::Repository(format!(
                    "Action dispatch failed: {e}"
                )));
            }
        }
        run_repo
            .update_run_status(&tenant_id, &run.id, &WorkflowRunStatus::Completed)
            .await?;
        Ok(())
    }
}
