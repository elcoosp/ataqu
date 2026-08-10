use crate::outbox::Outbox;
use sqlx::PgPool;
use std::sync::Arc;
use tracing::info;
use uuid::Uuid;

pub struct GdprSagaStarter {
    db: PgPool,
    outbox: Arc<dyn Outbox + Send + Sync>,
}

impl GdprSagaStarter {
    pub fn new(db: PgPool, outbox: Arc<dyn Outbox + Send + Sync>) -> Self {
        Self { db, outbox }
    }

    pub async fn handle_event(&self, tenant_id: Uuid) -> Result<(), String> {
        info!(tenant_id = %tenant_id, "Starting GDPR saga");
        let exists: Option<bool> = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM core.gdpr_saga_state WHERE tenant_id = $1)"
        )
        .bind(tenant_id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| format!("Failed to check saga existence: {}", e))?;

        if exists.unwrap_or(false) {
            info!(tenant_id = %tenant_id, "Saga already exists, skipping");
            return Ok(());
        }

        let trace_id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO core.gdpr_saga_state (tenant_id, step, retry_count, manifest, trace_id, created_at, updated_at)
             VALUES ($1, 'deactivate_users', 0, '[]'::jsonb, $2, NOW(), NOW())"
        )
        .bind(tenant_id)
        .bind(trace_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to insert saga state: {}", e))?;

        info!(tenant_id = %tenant_id, trace_id = %trace_id, "GDPR saga started");
        Ok(())
    }
}
