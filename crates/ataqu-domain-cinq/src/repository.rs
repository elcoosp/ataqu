use uuid::Uuid;
use async_trait::async_trait;

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
    async fn find_contact_by_id(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<Option<Contact>>;
    async fn search_contacts(&self, tenant_id: &TenantId, query: &str, limit: u64) -> CinqRepositoryResult<Vec<Contact>>;
    async fn list_contacts(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> CinqRepositoryResult<Vec<Contact>>;
    async fn delete_contact(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<()>;
}

#[async_trait]
pub trait DealRepository: Send + Sync {
    async fn save_deal(&self, deal: &Deal) -> CinqRepositoryResult<()>;
    async fn find_deal_by_id(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<Option<Deal>>;
    async fn list_deals(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> CinqRepositoryResult<Vec<Deal>>;
    async fn delete_deal(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<()>;
}

#[async_trait]
pub trait PipelineStageRepository: Send + Sync {
    async fn save_pipeline_stage(&self, stage: &PipelineStage) -> CinqRepositoryResult<()>;
    async fn find_pipeline_stage_by_id(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<Option<PipelineStage>>;
    async fn delete_pipeline_stage(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<()>;
    async fn list_pipeline_stages(&self, tenant_id: &TenantId) -> CinqRepositoryResult<Vec<PipelineStage>>;
}

#[async_trait]
pub trait ActivityRepository: Send + Sync {
    async fn save_activity(&self, activity: &Activity) -> CinqRepositoryResult<()>;
    async fn find_activity_by_id(&self, tenant_id: &TenantId, id: Uuid) -> CinqRepositoryResult<Option<Activity>>;
    async fn list_activities_for_contact(&self, tenant_id: &TenantId, contact_id: Uuid, limit: u64, offset: u64) -> CinqRepositoryResult<Vec<Activity>>;
}
