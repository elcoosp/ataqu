use ataqu_kernel::TenantId;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct EmployeeDocument {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub employee_id: Uuid,
    pub file_name: String,
    pub file_url: String,
    pub doc_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateDocumentCommand {
    pub tenant_id: TenantId,
    pub employee_id: Uuid,
    pub file_name: String,
    pub file_url: String,
    pub doc_type: String,
}
