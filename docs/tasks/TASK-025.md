# TASK-025: Repo + Migration: SPARK

## Execution Boundaries (STRICT)
 crates/ataqu-infra-migration/src/m_spark.rs\n- crates/ataqu-infra-repositories/src/spark_repo.rs

## Step-by-Step Implementation Details
 1. Create migrations: `collab_crm.workflows`, `collab_crm.leases` with `fence_token` column.\n2. Implement `SparkRepository`.\n3. Implement fenced lease acquisition: `UPDATE ... SET fence_token = fence_token + 1 WHERE ...` (ADR-020).

## Success Criteria & Verification
 - [ ] Fenced lease updates token atomically in a single UPDATE.
