# SPARK Validation Workflows Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow SPARK workflows to pause for human approval (e.g., Deal > 10k requires manager approval) before continuing.

**Architecture:** Add a `PendingApproval` state to the workflow run lifecycle. The SPARK dispatcher will halt execution when hitting an `ApprovalAction`. Expose an endpoint to approve/reject, which resumes or cancels the run.

**Tech Stack:** Rust, SeaORM, Axum.

---

## File Structure
- **Modify:** `crates/ataqu-domain-spark/src/workflow.rs` (Add ApprovalAction)
- **Create:** `crates/ataqu-infra-migration/src/m20250101_000016_create_workflow_runs.rs`
- **Modify:** `crates/ataqu-domain-spark/src/repository.rs` (Add run trait)
- **Modify:** `crates/ataqu-application/src/spark_service.rs`
- **Modify:** `crates/ataqu-api/src/handlers/spark.rs`

---

### Task 1: Database Migration for Workflow Runs

**Files:**
- Create: `crates/ataqu-infra-migration/src/m20250101_000016_create_workflow_runs.rs`

- [ ] **Step 1: Write the migration file**

```rust
// crates/ataqu-infra-migration/src/m20250101_000016_create_workflow_runs.rs
use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20250101_000016_create_workflow_runs"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            CREATE TABLE collab_crm.workflow_runs (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                workflow_id UUID NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('running', 'pending_approval', 'approved', 'rejected', 'completed', 'failed')),
                payload JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"DROP TABLE collab_crm.workflow_runs;"#
        ).await?;
        Ok(())
    }
}
```

- [ ] **Step 2: Run migration**

Run: `cargo run --bin migrator`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-infra-migration/
git commit -m "feat(db): add workflow_runs table for validation states"
```

---

### Task 2: Domain & Application Logic

**Files:**
- Modify: `crates/ataqu-domain-spark/src/workflow.rs`
- Modify: `crates/ataqu-domain-spark/src/repository.rs`
- Modify: `crates/ataqu-application/src/spark_service.rs`

- [ ] **Step 1: Update Domain Action Enum**

```rust
// In crates/ataqu-domain-spark/src/workflow.rs
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    // ... existing actions ...
    RequestApproval {
        approver_role: String,
    },
}
```

- [ ] **Step 2: Add Repository Trait**

```rust
// In crates/ataqu-domain-spark/src/repository.rs
#[async_trait]
pub trait WorkflowRunRepository: Send + Sync {
    async fn create_run(&self, run: &WorkflowRun) -> Result<(), String>;
    async fn update_run_status(&self, id: uuid::Uuid, status: &str) -> Result<(), String>;
    async fn get_run(&self, id: uuid::Uuid) -> Result<Option<WorkflowRun>, String>;
}

#[derive(Debug, Clone)]
pub struct WorkflowRun {
    pub id: uuid::Uuid,
    pub tenant_id: ataqu_kernel::TenantId,
    pub workflow_id: uuid::Uuid,
    pub status: String,
    pub payload: serde_json::Value,
}
```

- [ ] **Step 3: Update SparkService**

```rust
// In crates/ataqu-application/src/spark_service.rs
pub async fn execute_workflow(&self, workflow: &Workflow, run_id: uuid::Uuid) -> SparkResult<()> {
    for action in &workflow.actions {
        match action {
            Action::RequestApproval { .. } => {
                self.run_repo.update_run_status(run_id, "pending_approval").await
                    .map_err(|e| SparkServiceError::Repository(e))?;
                return Ok(()); // Halt execution
            }
            _ => self.dispatcher.dispatch(action, &TenantId::new(workflow.tenant_id)).await?,
        }
    }
    self.run_repo.update_run_status(run_id, "completed").await
        .map_err(|e| SparkServiceError::Repository(e))?;
    Ok(())
}

pub async fn approve_workflow_run(&self, run_id: uuid::Uuid) -> SparkResult<()> {
    self.run_repo.update_run_status(run_id, "approved").await
        .map_err(|e| SparkServiceError::Repository(e))?;

    // Fetch run and resume execution
    if let Some(run) = self.run_repo.get_run(run_id).await.map_err(|e| SparkServiceError::Repository(e))? {
        let workflow = self.get_workflow(TenantId::new(run.tenant_id.as_uuid()), run.workflow_id).await?;
        // Note: A real implementation would resume from the next action, not restart
        self.execute_workflow(&workflow, run_id).await?;
    }
    Ok(())
}
```

- [ ] **Step 4: Commit**

```bash
git add crates/ataqu-domain-spark/src/workflow.rs crates/ataqu-domain-spark/src/repository.rs crates/ataqu-application/src/spark_service.rs
git commit -m "feat(spark): add approval action and run pausing logic"
```

---

### Task 3: API Endpoints

**Files:**
- Modify: `crates/ataqu-api/src/handlers/spark.rs`

- [ ] **Step 1: Add API Handler**

```rust
// In crates/ataqu-api/src/handlers/spark.rs
pub async fn approve_run(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(run_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state.spark_service.approve_workflow_run(run_id).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::OK)
}
```

- [ ] **Step 2: Add route**

```rust
.route("/workflows/runs/:id/approve", post(approve_run))
```

- [ ] **Step 3: Run check & Commit**

Run: `cargo check --workspace`
Expected: PASS

```bash
git add crates/ataqu-api/src/handlers/spark.rs
git commit -m "feat(api): add workflow run approval endpoint"
```
