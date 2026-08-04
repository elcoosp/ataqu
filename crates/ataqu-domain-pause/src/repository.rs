//! Repository port traits for PAUSE domain.
use crate::{Employee, LeaveRequest, LeaveStatus, PauseDomainError};
use async_trait::async_trait;
use ataqu_kernel::TenantId;
use std::time::SystemTime;
use uuid::Uuid;

#[async_trait]
pub trait EmployeeRepositoryPort: Send + Sync {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &crate::EmployeeCreatedEvent,
    ) -> Result<(), PauseDomainError>;
    async fn find_by_id(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<Option<Employee>, PauseDomainError>;
    async fn list(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Employee>, PauseDomainError>;
    async fn search(
        &self,
        tenant_id: &TenantId,
        query: &str,
        limit: u64,
    ) -> Result<Vec<Employee>, PauseDomainError>;
    async fn deactivate(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<(), PauseDomainError>;
    async fn count(&self, tenant_id: &TenantId) -> Result<u64, PauseDomainError>;
}

#[async_trait]
pub trait LeaveRequestRepositoryPort: Send + Sync {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &crate::LeaveRequestedEvent,
    ) -> Result<(), PauseDomainError>;
    async fn find_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> Result<Option<LeaveRequest>, PauseDomainError>;
    async fn list(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<LeaveRequest>, PauseDomainError>;
    async fn list_for_employee(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<Vec<LeaveRequest>, PauseDomainError>;
    async fn list_pending(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<LeaveRequest>, PauseDomainError>;
    async fn update_status(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
        status: LeaveStatus,
        reviewer_id: Uuid,
        updated_at: SystemTime,
    ) -> Result<(), PauseDomainError>;
}
