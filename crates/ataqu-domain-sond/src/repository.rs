use async_trait::async_trait;
use uuid::Uuid;
use ataqu_kernel::TenantId;
use crate::form::Form;
use crate::response::Response;
use crate::errors::SondError;

#[async_trait]
pub trait SondRepository: Send + Sync {
    async fn get_form(&self, form_id: Uuid) -> Result<Option<Form>, SondError>;
    async fn save_form(&self, form: &Form) -> Result<(), SondError>;
    async fn get_response(&self, response_id: Uuid) -> Result<Option<Response>, SondError>;
    async fn save_response(&self, response: &Response) -> Result<(), SondError>;
    async fn list_forms(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> Result<Vec<Form>, SondError>;
}
