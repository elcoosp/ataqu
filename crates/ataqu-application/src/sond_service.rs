use ataqu_kernel::TenantId;
use uuid::Uuid;
use ataqu_kernel::{Clock, IdGenerator};

pub struct SondService;

impl SondService {
    pub async fn create_form(
        &self,
        _tenant_id: &TenantId,
        _command_id: Uuid,
        _payload: serde_json::Value,
    ) -> Result<Uuid, anyhow::Error> {
        Ok(Uuid::new_v4())
    }

    pub async fn create_submission(
        &self,
        _tenant_id: &TenantId,
        _form_id: Uuid,
        _command_id: Uuid,
        _payload: serde_json::Value,
    ) -> Result<Uuid, anyhow::Error> {
        Ok(Uuid::new_v4())
    }

    pub async fn export_form(
        &self,
        _tenant_id: &TenantId,
        _form_id: Uuid,
    ) -> Result<Vec<u8>, anyhow::Error> {
        Ok(vec![])
    }
}