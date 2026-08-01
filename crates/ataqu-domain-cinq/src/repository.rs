use std::future::Future;

use uuid::Uuid;

use crate::activity::Activity;
use crate::contact::Contact;
use crate::deal::Deal;
use crate::error::CinqDomainError;
use crate::pipeline::PipelineStage;
use ataqu_kernel::TenantId;

pub type CinqRepositoryResult<T> = Result<T, CinqDomainError>;

pub trait ContactRepository: Send + Sync {
    fn save_contact(
        &self,
        contact: &Contact,
    ) -> impl Future<Output = CinqRepositoryResult<()>> + Send;
    fn find_contact_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> impl Future<Output = CinqRepositoryResult<Option<Contact>>> + Send;
    fn list_contacts(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> impl Future<Output = CinqRepositoryResult<Vec<Contact>>> + Send;
}

pub trait DealRepository: Send + Sync {
    fn save_deal(&self, deal: &Deal) -> impl Future<Output = CinqRepositoryResult<()>> + Send;
    fn find_deal_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> impl Future<Output = CinqRepositoryResult<Option<Deal>>> + Send;
    fn list_deals(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> impl Future<Output = CinqRepositoryResult<Vec<Deal>>> + Send;
}

pub trait PipelineStageRepository: Send + Sync {
    fn save_pipeline_stage(
        &self,
        stage: &PipelineStage,
    ) -> impl Future<Output = CinqRepositoryResult<()>> + Send;
    fn find_pipeline_stage_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> impl Future<Output = CinqRepositoryResult<Option<PipelineStage>>> + Send;
    fn list_pipeline_stages(
        &self,
        tenant_id: &TenantId,
    ) -> impl Future<Output = CinqRepositoryResult<Vec<PipelineStage>>> + Send;
}

pub trait ActivityRepository: Send + Sync {
    fn save_activity(
        &self,
        activity: &Activity,
    ) -> impl Future<Output = CinqRepositoryResult<()>> + Send;
    fn find_activity_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> impl Future<Output = CinqRepositoryResult<Option<Activity>>> + Send;
    fn list_activities_for_contact(
        &self,
        tenant_id: &TenantId,
        contact_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> impl Future<Output = CinqRepositoryResult<Vec<Activity>>> + Send;
}
