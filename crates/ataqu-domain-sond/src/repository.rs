use crate::errors::SondError;
use crate::form::Form;
use crate::response::Response;
use async_trait::async_trait;
use ataqu_kernel::TenantId;
use uuid::Uuid;

#[async_trait]
pub trait SondRepository: Send + Sync {
    async fn get_form(&self, tenant_id: TenantId, form_id: Uuid)
    -> Result<Option<Form>, SondError>;
    async fn get_form_by_id(&self, form_id: Uuid) -> Result<Option<Form>, SondError>;
    async fn save_form(&self, form: &Form) -> Result<(), SondError>;
    async fn delete_form(&self, tenant_id: TenantId, form_id: Uuid) -> Result<(), SondError>;
    async fn get_response(&self, response_id: Uuid) -> Result<Option<Response>, SondError>;
    async fn save_response(&self, response: &Response) -> Result<(), SondError>;
    async fn list_forms(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Form>, SondError>;
    async fn list_responses(
        &self,
        tenant_id: &TenantId,
        form_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Response>, SondError>;
}
