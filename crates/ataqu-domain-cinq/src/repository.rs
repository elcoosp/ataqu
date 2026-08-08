use async_trait::async_trait;
use uuid::Uuid;

use crate::activity::Activity;
use crate::contact::Contact;
use crate::deal::Deal;
use crate::error::CinqDomainError;
use crate::pipeline::PipelineStage;
use ataqu_kernel::TenantId;

pub type CinqRepositoryResult<T> = Result<T, CinqDomainError>;

#[async_trait]
pub trait ContactRepository: Send + Sync {
    async fn save_contact(&self, contact: &Contact) -> CinqRepositoryResult<()>;
    async fn find_contact_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> CinqRepositoryResult<Option<Contact>>;
    async fn search_contacts(
        &self,
        tenant_id: &TenantId,
        query: &str,
        limit: u64,
    ) -> CinqRepositoryResult<Vec<Contact>>;
    async fn find_by_custom_field_exact(
        &self,
        tenant_id: &TenantId,
        field: &str,
        value: &serde_json::Value,
    ) -> CinqRepositoryResult<Vec<Contact>>;
    async fn find_by_custom_field_text(
        &self,
        tenant_id: &TenantId,
        field: &str,
        search: &str,
    ) -> CinqRepositoryResult<Vec<Contact>>;
    async fn find_by_custom_fields_cross(
        &self,
        tenant_id: &TenantId,
        search: &str,
        limit: u64,
    ) -> CinqRepositoryResult<Vec<Contact>>;
    async fn list_contacts(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> CinqRepositoryResult<Vec<Contact>>;
    async fn count_contacts(&self, tenant_id: &TenantId) -> CinqRepositoryResult<u64>;
    async fn delete_contact(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<()>;
    async fn bulk_insert_contacts(&self, contacts: &[Contact]) -> CinqRepositoryResult<()>;
}

#[async_trait]
pub trait DealRepository: Send + Sync {
    async fn save_deal(&self, deal: &Deal) -> CinqRepositoryResult<()>;
    async fn find_deal_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> CinqRepositoryResult<Option<Deal>>;
    async fn list_deals(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> CinqRepositoryResult<Vec<Deal>>;

    async fn count_deals(&self, tenant_id: &TenantId) -> CinqRepositoryResult<u64>;
    async fn delete_deal(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<()>;
}

#[async_trait]
pub trait PipelineStageRepository: Send + Sync {
    async fn save_pipeline_stage(&self, stage: &PipelineStage) -> CinqRepositoryResult<()>;
    async fn find_pipeline_stage_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> CinqRepositoryResult<Option<PipelineStage>>;
    async fn delete_pipeline_stage(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> CinqRepositoryResult<()>;
    async fn list_pipeline_stages(
        &self,
        tenant_id: &TenantId,
    ) -> CinqRepositoryResult<Vec<PipelineStage>>;
}

#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn save_task(&self, task: &crate::task::Task) -> CinqRepositoryResult<()>;
    async fn find_task_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> CinqRepositoryResult<Option<crate::task::Task>>;
    async fn list_tasks(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> CinqRepositoryResult<Vec<crate::task::Task>>;
    async fn list_tasks_for_contact(
        &self,
        tenant_id: &TenantId,
        contact_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> CinqRepositoryResult<Vec<crate::task::Task>>;
    async fn delete_task(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<()>;
}

#[async_trait]
pub trait ActivityRepository: Send + Sync {
    async fn save_activity(&self, activity: &Activity) -> CinqRepositoryResult<()>;
    async fn find_activity_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> CinqRepositoryResult<Option<Activity>>;
    async fn list_activities_for_contact(
        &self,
        tenant_id: &TenantId,
        contact_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> CinqRepositoryResult<Vec<Activity>>;

    async fn count_activities_for_contact(
        &self,
        tenant_id: &TenantId,
        contact_id: Uuid,
    ) -> CinqRepositoryResult<u64>;

    async fn list_all_activities(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> CinqRepositoryResult<Vec<Activity>>;

    async fn count_all_activities(&self, tenant_id: &TenantId) -> CinqRepositoryResult<u64>;
}
