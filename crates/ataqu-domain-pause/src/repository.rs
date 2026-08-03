//! Repository port traits for PAUSE domain.
use async_trait::async_trait;
use ataqu_kernel::TenantId;
use crate::{EmployeeCreatedEvent, LeaveRequestedEvent, PauseDomainError};

#[async_trait]
pub trait EmployeeRepositoryPort: Send + Sync {
    async fn insert(&self, tenant_id: &TenantId, event: &EmployeeCreatedEvent) -> Result<(), PauseDomainError>;
}

#[async_trait]
pub trait LeaveRequestRepositoryPort: Send + Sync {
    async fn insert(&self, tenant_id: &TenantId, event: &LeaveRequestedEvent) -> Result<(), PauseDomainError>;
}
