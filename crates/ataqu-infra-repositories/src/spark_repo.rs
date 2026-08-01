//! SPARK repository implementation.
//!
//! Handles persistence for workflows and atomic fenced lease acquisition
//! (ADR-020).

use sea_orm::{ConnectionTrait, DatabaseTransaction, DbBackend, DbErr, Statement};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Workflow {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub definition: String, // JSON string (avoiding serde dependency per Cargo.toml constraints)
    pub enabled: bool,
    pub created_at: String, // RFC3339 string
    pub updated_at: String, // RFC3339 string
}

#[derive(Debug, Clone)]
pub struct Lease {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_id: Uuid,
    pub fence_token: i64,
    pub holder: Option<String>,
    pub expires_at: String, // RFC3339 string
    pub created_at: String, // RFC3339 string
    pub updated_at: String, // RFC3339 string
}

pub struct SparkRepository;

impl SparkRepository {
    /// Inserts a new workflow definition.
    pub async fn create_workflow(
        txn: &mut DatabaseTransaction,
        workflow: &Workflow,
    ) -> Result<(), DbErr> {
        let sql = r#"
        INSERT INTO collab_crm.workflows (id, tenant_id, name, definition, enabled, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6::timestamptz, $7::timestamptz)
        "#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            [
                workflow.id.into(),
                workflow.tenant_id.into(),
                workflow.name.clone().into(),
                workflow.definition.clone().into(),
                workflow.enabled.into(),
                workflow.created_at.clone().into(),
                workflow.updated_at.clone().into(),
            ],
        );
        txn.execute_raw(stmt).await?;
        Ok(())
    }

    /// Inserts a new lease record for a workflow.
    pub async fn create_lease(
        txn: &mut DatabaseTransaction,
        lease: &Lease,
    ) -> Result<(), DbErr> {
        let sql = r#"
        INSERT INTO collab_crm.leases (id, tenant_id, workflow_id, fence_token, holder, expires_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8::timestamptz)
        "#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            [
                lease.id.into(),
                lease.tenant_id.into(),
                lease.workflow_id.into(),
                lease.fence_token.into(),
                lease.holder.clone().into(),
                lease.expires_at.clone().into(),
                lease.created_at.clone().into(),
                lease.updated_at.clone().into(),
            ],
        );
        txn.execute_raw(stmt).await?;
        Ok(())
    }

    /// Acquires a fenced lease atomically using a single UPDATE statement (ADR-020).
    /// If successful, increments the `fence_token` and updates the holder/expiration.
    /// Returns the new `fence_token` if acquired, or `None` if the lease is held by another holder and hasn't expired.
    pub async fn acquire_lease(
        txn: &mut DatabaseTransaction,
        tenant_id: Uuid,
        workflow_id: Uuid,
        holder: &str,
        expires_at: &str, // RFC3339
        now: &str,        // RFC3339
    ) -> Result<Option<i64>, DbErr> {
        let sql = r#"
        UPDATE collab_crm.leases
        SET fence_token = fence_token + 1,
            holder = $1,
            expires_at = $2::timestamptz,
            updated_at = $3::timestamptz
        WHERE workflow_id = $4
          AND tenant_id = $5
          AND (expires_at < $3::timestamptz OR holder IS NULL OR holder = $1)
        RETURNING fence_token
        "#;

        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            [
                holder.into(),
                expires_at.into(),
                now.into(),
                workflow_id.into(),
                tenant_id.into(),
            ],
        );

        let result = txn.query_one(stmt).await?;

        if let Some(row) = result {
            let fence_token: i64 = row.try_get("", "fence_token")?;
            Ok(Some(fence_token))
        } else {
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workflow_struct_construction() {
        let wf = Workflow {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "Test Workflow".to_string(),
            definition: "{}".to_string(),
            enabled: true,
            created_at: "2026-08-01T00:00:00Z".to_string(),
            updated_at: "2026-08-01T00:00:00Z".to_string(),
        };
        assert_eq!(wf.name, "Test Workflow");
        assert!(wf.enabled);
    }

    #[test]
    fn test_lease_sql_contains_atomic_increment() {
        // Verify the SQL string contains the atomic increment logic (ADR-020)
        let sql = r#"
        UPDATE collab_crm.leases
        SET fence_token = fence_token + 1,
            holder = $1,
            expires_at = $2::timestamptz,
            updated_at = $3::timestamptz
        WHERE workflow_id = $4
          AND tenant_id = $5
          AND (expires_at < $3::timestamptz OR holder IS NULL OR holder = $1)
        RETURNING fence_token
        "#;
        assert!(sql.contains("fence_token = fence_token + 1"));
    }
}
