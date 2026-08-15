use sqlx::{PgPool, Row};
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::outbox::Outbox;
use ataqu_domain_gdpr::GdprRegistry;
use ataqu_domain_gdpr::{GdprSaga, GdprStep, saga::transition_saga};
use ataqu_infra_storage::s3_service::S3Service;

pub struct GdprSagaRunner {
    db: PgPool,
    outbox: Arc<dyn Outbox + Send + Sync>,
    s3_service: Arc<S3Service>,
}

impl GdprSagaRunner {
    pub fn new(
        db: PgPool,
        outbox: Arc<dyn Outbox + Send + Sync>,
        s3_service: Arc<S3Service>,
    ) -> Self {
        Self { db, outbox, s3_service }
    }

    pub async fn run(&self) -> ! {
        info!("GDPR Saga Runner started");
        loop {
            if let Err(e) = self.process_pending_sagas().await {
                error!(error = %e, "GDPR saga processing failed");
            }
            tokio::time::sleep(std::time::Duration::from_secs(10)).await;
        }
    }

    async fn process_pending_sagas(&self) -> Result<(), String> {
        let rows = sqlx::query(
            r#"
            SELECT tenant_id, step, retry_count, manifest, trace_id, created_at, updated_at
            FROM core.gdpr_saga_state
            WHERE step != 'complete'
            ORDER BY created_at ASC
            LIMIT 5
            "#,
        )
        .fetch_all(&self.db)
        .await
        .map_err(|e| format!("Failed to fetch sagas: {}", e))?;

        for row in rows {
            let tenant_id: Uuid = row
                .try_get("tenant_id")
                .map_err(|e| format!("Failed to parse tenant_id: {}", e))?;
            let step_str: String = row
                .try_get("step")
                .map_err(|e| format!("Failed to parse step: {}", e))?;
            let step = match step_str.as_str() {
                "deactivate_users" => GdprStep::DeactivateUsers,
                "anonymize_pii" => GdprStep::AnonymizePII,
                "delete_s3_files" => GdprStep::DeleteS3Files,
                "purge_tables" => GdprStep::PurgeTables,
                "complete" => GdprStep::Complete,
                _ => continue,
            };
            let retry_count: i32 = row
                .try_get("retry_count")
                .map_err(|e| format!("Failed to parse retry_count: {}", e))?;
            let manifest_str: serde_json::Value = row
                .try_get("manifest")
                .map_err(|e| format!("Failed to parse manifest: {}", e))?;
            let manifest: Vec<String> = serde_json::from_value(manifest_str).unwrap_or_default();
            let trace_id: Uuid = row
                .try_get("trace_id")
                .map_err(|e| format!("Failed to parse trace_id: {}", e))?;
            let created_at: chrono::DateTime<chrono::Utc> = row
                .try_get("created_at")
                .map_err(|e| format!("Failed to parse created_at: {}", e))?;
            let updated_at: chrono::DateTime<chrono::Utc> = row
                .try_get("updated_at")
                .map_err(|e| format!("Failed to parse updated_at: {}", e))?;

            let mut saga = GdprSaga {
                tenant_id,
                step,
                retry_count: retry_count as u32,
                manifest,
                trace_id,
                created_at: created_at.into(),
                updated_at: updated_at.into(),
            };

            info!(tenant_id = %tenant_id, step = ?step, "Processing GDPR saga step");

            let result = self.execute_step(&saga).await;
            match transition_saga(&mut saga, result) {
                Ok(true) => {
                    info!(tenant_id = %tenant_id, "GDPR saga completed");
                    self.mark_saga_complete(&saga).await?;
                    let payload = serde_json::json!({
                        "tenant_id": tenant_id,
                        "trace_id": trace_id,
                    });
                    self.outbox
                        .append("core", "GdprDeletionCompleted", tenant_id, &payload)
                        .await
                        .map_err(|e| format!("Failed to emit completion event: {}", e))?;
                }
                Ok(false) => {
                    self.update_saga_state(&saga).await?;
                }
                Err(e) => {
                    warn!(tenant_id = %tenant_id, step = ?step, error = ?e, "GDPR step failed");
                    self.update_saga_state(&saga).await?;
                    if saga.retry_count >= 3 {
                        let payload = serde_json::json!({
                            "tenant_id": tenant_id,
                            "trace_id": trace_id,
                            "step": step.as_str(),
                        });
                        self.outbox
                            .append("core", "GdprDeletionFailed", tenant_id, &payload)
                            .await
                            .map_err(|e| format!("Failed to emit failure event: {}", e))?;
                    }
                }
            }
        }
        Ok(())
    }

    async fn execute_step(&self, saga: &GdprSaga) -> Result<(), String> {
        match saga.step {
            GdprStep::DeactivateUsers => self.deactivate_users(saga.tenant_id).await,
            GdprStep::AnonymizePII => self.anonymize_pii(saga.tenant_id).await,
            GdprStep::DeleteS3Files => self.delete_s3_files(saga.tenant_id).await,
            GdprStep::PurgeTables => self.purge_tables(saga.tenant_id).await,
            GdprStep::Complete => Ok(()),
        }
    }

    async fn deactivate_users(&self, tenant_id: Uuid) -> Result<(), String> {
        sqlx::query(
            "UPDATE core.users SET is_active = false, version = version + 1 WHERE tenant_id = $1",
        )
        .bind(tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to deactivate users: {}", e))?;
        Ok(())
    }

    async fn anonymize_pii(&self, tenant_id: Uuid) -> Result<(), String> {
        sqlx::query(
            "UPDATE core.users SET email = 'deleted@user.com', name = NULL, mfa_secret = NULL WHERE tenant_id = $1"
        )
        .bind(tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to anonymize users: {}", e))?;
        Ok(())
    }

    /// Delete every S3 object the tenant references in `core.file_references`.
    /// Objects with no remaining references after deletion are safe to remove;
    /// we delete by key and let the orphan reaper reclaim any stragglers.
    async fn delete_s3_files(&self, tenant_id: Uuid) -> Result<(), String> {
        let rows = sqlx::query(
            "SELECT file_key FROM core.file_references WHERE tenant_id = $1 AND status != 'deleted'",
        )
        .bind(tenant_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| format!("Failed to list file references: {}", e))?;

        for row in rows {
            let file_key: String = row
                .try_get("file_key")
                .map_err(|e| format!("Failed to parse file_key: {}", e))?;
            if let Err(e) = self.s3_service.delete_object(&file_key).await {
                warn!(
                    tenant_id = %tenant_id,
                    file_key = %file_key,
                    error = %e,
                    "Failed to delete S3 object during GDPR erasure"
                );
                return Err(format!("Failed to delete S3 object {file_key}: {e}"));
            }
        }

        // Mark references as deleted so we don't retry them.
        sqlx::query("UPDATE core.file_references SET status = 'deleted' WHERE tenant_id = $1")
            .bind(tenant_id)
            .execute(&self.db)
            .await
            .map_err(|e| format!("Failed to mark file references deleted: {}", e))?;

        info!(tenant_id = %tenant_id, "Deleted S3 files for tenant");
        Ok(())
    }

    async fn purge_tables(&self, tenant_id: Uuid) -> Result<(), String> {
        let registry = GdprRegistry::new();
        for table in registry.tables {
            let sql = format!(
                "DELETE FROM {}.{} WHERE {} = $1",
                table.schema, table.table, table.tenant_id_column
            );
            // Leak the SQL string to make it static for sqlx::query
            let sql_static: &'static str = Box::leak(sql.into_boxed_str());
            sqlx::query(sql_static)
                .bind(tenant_id)
                .execute(&self.db)
                .await
                .map_err(|e| {
                    format!(
                        "Failed to purge table {}.{}: {}",
                        table.schema, table.table, e
                    )
                })?;
        }
        Ok(())
    }

    async fn mark_saga_complete(&self, saga: &GdprSaga) -> Result<(), String> {
        sqlx::query(
            "UPDATE core.gdpr_saga_state SET step = 'complete', updated_at = NOW() WHERE tenant_id = $1"
        )
        .bind(saga.tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to mark saga complete: {}", e))?;
        Ok(())
    }

    async fn update_saga_state(&self, saga: &GdprSaga) -> Result<(), String> {
        let step_str = saga.step.as_str();
        let manifest = serde_json::to_value(&saga.manifest)
            .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
        sqlx::query(
            "UPDATE core.gdpr_saga_state SET step = $1, retry_count = $2, manifest = $3, updated_at = NOW() WHERE tenant_id = $4"
        )
        .bind(step_str)
        .bind(saga.retry_count as i32)
        .bind(manifest)
        .bind(saga.tenant_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to update saga state: {}", e))?;
        Ok(())
    }
}
