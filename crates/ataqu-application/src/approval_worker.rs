//! Approval worker for SPARK workflows.
//! Polls the pending_approvals table and notifies approvers via DIAL.
use std::sync::Arc;
use std::time::Duration;

use ataqu_kernel::TenantId;
use uuid::Uuid;

use crate::dial_service::{DialService, SendMessageCommand};
use crate::spark_service::SparkService;
use ataqu_infra_repositories::pending_approval_repo::PendingApprovalRepository;

/// How many pending approvals to page through per poll cycle.
const POLL_BATCH_LIMIT: u64 = 100;

pub struct ApprovalWorker {
    approval_repo: Arc<dyn PendingApprovalRepository + Send + Sync>,
    spark_service: Arc<SparkService>,
    dial_service: Arc<DialService>,
    /// System actor used when the worker posts notifications.
    system_user_id: Uuid,
    /// DIAL channel that receives approval notifications (UUID, from config/env).
    notify_channel_id: Option<Uuid>,
    poll_interval: Duration,
}

impl ApprovalWorker {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        approval_repo: Arc<dyn PendingApprovalRepository + Send + Sync>,
        spark_service: Arc<SparkService>,
        dial_service: Arc<DialService>,
        system_user_id: Uuid,
        notify_channel_id: Option<Uuid>,
    ) -> Self {
        Self {
            approval_repo,
            spark_service,
            dial_service,
            system_user_id,
            notify_channel_id,
            poll_interval: Duration::from_secs(30),
        }
    }

    pub fn with_poll_interval(mut self, interval: Duration) -> Self {
        self.poll_interval = interval;
        self
    }

    pub async fn run(&self) -> ! {
        tracing::info!(
            "Approval worker started, polling every {:?}",
            self.poll_interval
        );
        loop {
            if let Err(e) = self.process_pending_approvals().await {
                tracing::error!("Approval worker error: {}", e);
            }
            tokio::time::sleep(self.poll_interval).await;
        }
    }

    /// Poll every pending approval across all tenants and notify approvers.
    ///
    /// The worker never approves or rejects — that stays an explicit,
    /// authenticated action via the API (`approve_workflow`/`reject_workflow`).
    /// Its job is to surface pending items to the humans who can act on them.
    async fn process_pending_approvals(&self) -> Result<(), String> {
        let pending = self
            .approval_repo
            .list_all_pending(POLL_BATCH_LIMIT)
            .await?;

        if pending.is_empty() {
            return Ok(());
        }

        for approval in pending {
            // De-dupe: skip items we've already notified about (best-effort via
            // an `notified` flag would be ideal; for now we rely on the channel
            // being low-traffic and the run staying pending until acted upon).
            let message = format!(
                "Approval requested for workflow {} (run {}). Role required: {}.",
                approval.workflow_id, approval.run_id, approval.approver_role
            );
            if let Some(channel_id) = self.notify_channel_id {
                let cmd = SendMessageCommand {
                    tenant_id: approval.tenant_id,
                    channel_id,
                    thread_id: None,
                    author_id: self.system_user_id,
                    content: message,
                };
                if let Err(e) = self.dial_service.send_message(cmd).await {
                    tracing::warn!(
                        run_id = %approval.run_id,
                        error = %e,
                        "Failed to send approval notification"
                    );
                }
            } else {
                tracing::info!(
                    run_id = %approval.run_id,
                    role = %approval.approver_role,
                    "Pending approval (no notify channel configured)"
                );
            }
        }
        Ok(())
    }

    /// Approve a specific pending approval by run_id (called from the API).
    pub async fn approve_run(
        &self,
        tenant_id: TenantId,
        run_id: Uuid,
        approved_by: Uuid,
    ) -> Result<(), String> {
        let approval = self
            .approval_repo
            .find_by_run_id(tenant_id, run_id)
            .await?
            .ok_or("Approval not found")?;

        if approval.status != "pending" {
            return Err(format!("Approval is already {}", approval.status));
        }

        // Delegate to the service: marks the row approved and resumes the run.
        self.spark_service
            .approve_workflow_run(tenant_id, run_id, approved_by)
            .await
            .map_err(|e| format!("Failed to resume workflow: {}", e))?;

        Ok(())
    }

    /// Reject a specific pending approval by run_id (called from the API).
    pub async fn reject_run(
        &self,
        tenant_id: TenantId,
        run_id: Uuid,
        rejected_by: Uuid,
    ) -> Result<(), String> {
        let approval = self
            .approval_repo
            .find_by_run_id(tenant_id, run_id)
            .await?
            .ok_or("Approval not found")?;

        if approval.status != "pending" {
            return Err(format!("Approval is already {}", approval.status));
        }

        // Delegate to the service: marks the row rejected and sets the run status.
        self.spark_service
            .reject_workflow_run(tenant_id, run_id, rejected_by)
            .await
            .map_err(|e| format!("Failed to reject workflow: {}", e))?;

        Ok(())
    }
}
