use uuid::Uuid;

/// Trait for auditing actions (stub).
pub trait AuditRepositoryTrait: Send + Sync {
    #[allow(clippy::too_many_arguments)]
    fn log_event(
        &self,
        _tenant_id: Uuid,
        _user_id: Uuid,
        _action: String,
        _app: String,
        _entity_type: Option<String>,
        _entity_id: Option<Uuid>,
        _old_value: Option<serde_json::Value>,
        _new_value: Option<serde_json::Value>,
        _ip_address: Option<String>,
        _user_agent: Option<String>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // No-op stub
        Ok(())
    }
}

/// Dummy implementation.
pub mod dummy {
    use super::*;
    pub struct DummyAuditRepository;
    impl AuditRepositoryTrait for DummyAuditRepository {}
}
