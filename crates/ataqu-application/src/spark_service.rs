//! SPARK workflow service – in-memory workflow execution.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use ataqu_kernel::{Clock, IdGenerator, TenantId};

#[derive(Debug, Clone)]
pub struct Workflow {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub steps: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct WorkflowExecution {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub tenant_id: TenantId,
    pub status: String,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone)]
pub struct CreateWorkflowCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub steps: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ExecuteWorkflowCommand {
    pub tenant_id: TenantId,
    pub workflow_id: Uuid,
}

#[derive(Debug, thiserror::Error)]
pub enum SparkServiceError {
    #[error("Workflow not found")]
    WorkflowNotFound,
    #[error("Workflow already executing")]
    AlreadyExecuting,
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type SparkResult<T> = Result<T, SparkServiceError>;

#[derive(Default)]
struct WorkflowStore {
    workflows: Arc<RwLock<HashMap<Uuid, Workflow>>>,
}

#[derive(Default)]
struct ExecutionStore {
    executions: Arc<RwLock<Vec<WorkflowExecution>>>,
}

pub struct SparkService {
    workflows: WorkflowStore,
    executions: ExecutionStore,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl SparkService {
    pub fn new(id_gen: Arc<dyn IdGenerator>, clock: Arc<dyn Clock>) -> Self {
        Self {
            workflows: WorkflowStore::default(),
            executions: ExecutionStore::default(),
            id_gen,
            clock,
        }
    }

    pub async fn create_workflow(&self, cmd: CreateWorkflowCommand) -> SparkResult<Workflow> {
        if cmd.name.trim().is_empty() {
            return Err(SparkServiceError::Validation("Name cannot be empty".into()));
        }
        if cmd.steps.is_empty() {
            return Err(SparkServiceError::Validation("At least one step required".into()));
        }
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let wf = Workflow {
            id,
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            steps: cmd.steps,
            created_at: now,
        };
        self.workflows.workflows.write().unwrap().insert(id, wf.clone());
        Ok(wf)
    }

    pub async fn get_workflow(&self, tenant_id: TenantId, id: Uuid) -> SparkResult<Workflow> {
        let map = self.workflows.workflows.read().unwrap();
        map.get(&id)
            .filter(|w| w.tenant_id == tenant_id)
            .cloned()
            .ok_or(SparkServiceError::WorkflowNotFound)
    }

    pub async fn execute_workflow(&self, cmd: ExecuteWorkflowCommand) -> SparkResult<WorkflowExecution> {
        let _wf = self.get_workflow(cmd.tenant_id, cmd.workflow_id).await?;
        // Check if already executing (simplistic: check last execution status)
        let execs = self.executions.executions.read().unwrap();
        let already = execs.iter().any(|e| e.workflow_id == cmd.workflow_id && e.status == "running");
        if already {
            return Err(SparkServiceError::AlreadyExecuting);
        }
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let exec = WorkflowExecution {
            id,
            workflow_id: cmd.workflow_id,
            tenant_id: cmd.tenant_id,
            status: "running".to_string(),
            started_at: now,
            completed_at: None,
        };
        self.executions.executions.write().unwrap().push(exec.clone());
        // In real implementation, would actually run steps.
        Ok(exec)
    }

    pub async fn list_workflows(&self, tenant_id: TenantId) -> SparkResult<Vec<Workflow>> {
        let map = self.workflows.workflows.read().unwrap();
        let wfs = map.values().filter(|w| w.tenant_id == tenant_id).cloned().collect();
        Ok(wfs)
    }
}
