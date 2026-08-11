//! Audit logging helper.
use ataqu_domain_aegis::repository::AuditRepositoryTrait;
use ataqu_kernel::TenantId;
use serde_json::Value;
use std::net::IpAddr;
use std::sync::Arc;
use uuid::Uuid;

pub async fn log_audit(
    repo: &Option<Arc<dyn AuditRepositoryTrait + Send + Sync>>,
    tenant_id: TenantId,
    user_id: Uuid,
    action: &str,
    app: &str,
    entity_type: Option<&str>,
    entity_id: Option<Uuid>,
    old_value: Option<Value>,
    new_value: Option<Value>,
    ip_address: Option<IpAddr>,
    user_agent: Option<&str>,
) {
    if let Some(r) = repo {
        let _ = r
            .append_log(
                tenant_id,
                user_id,
                action,
                app,
                entity_type,
                entity_id,
                old_value,
                new_value,
                ip_address,
                user_agent,
            )
            .await;
    }
}
