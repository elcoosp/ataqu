# TASK-077: SPARK Validation Workflows

## Objective
Allow SPARK workflows to pause for human approval (e.g., Deal > 10k requires manager approval) before continuing. Add a `PendingApproval` state to workflow runs.

## Execution Boundaries
- `crates/ataqu-infra-migration/src/m20250101_000016_create_workflow_runs.rs` (overwrite)
- `crates/ataqu-domain-spark/src/workflow.rs` (modify)
- `crates/ataqu-domain-spark/src/repository.rs` (modify)
- `crates/ataqu-application/src/spark_service.rs` (modify)
- `crates/ataqu-api/src/handlers/spark.rs` (modify)

## Step-by-Step Implementation Details

1. **Create migration** for `collab_crm.workflow_runs` with columns: `id`, `tenant_id`, `workflow_id`, `status` (running/pending_approval/approved/rejected/completed/failed), `payload`, `created_at`, `updated_at`.

2. **Add `RequestApproval` action** to the `Action` enum in `workflow.rs`.

3. **Define `WorkflowRun` domain struct** and a `WorkflowRunRepository` trait with `create_run`, `update_run_status`, `get_run`.

4. **Modify `SparkService.execute_workflow`** to halt execution when hitting a `RequestApproval` action, set run status to `pending_approval`, and return early.

5. **Implement `approve_workflow_run`** in `SparkService` that updates status to `approved` and resumes execution.

6. **Add API endpoint** `POST /api/v1/spark/workflows/runs/:id/approve` (admin only).

## Success Criteria & Verification
- [ ] Migration creates the table.
- [ ] Domain action is defined.
- [ ] Workflow execution pauses at approval.
- [ ] Approval endpoint resumes the workflow.
- [ ] `cargo check --workspace` passes.
