use async_trait::async_trait;
use ataqu_kernel::TenantId;
use crate::chat::UserId;
use crate::error::DialError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PresenceStatus {
    Online,
    Away,
    Offline,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Presence {
    pub user_id: UserId,
    pub tenant_id: TenantId,
    pub status: PresenceStatus,
}

#[async_trait]
pub trait PresenceStore: Send + Sync {
    async fn set_presence(&self, tenant_id: &TenantId, user_id: &UserId, status: PresenceStatus) -> Result<(), DialError>;
    async fn get_presence(&self, tenant_id: &TenantId, user_id: &UserId) -> Result<Option<PresenceStatus>, DialError>;
    async fn remove_presence(&self, tenant_id: &TenantId, user_id: &UserId) -> Result<(), DialError>;
    async fn get_online_users(&self, tenant_id: &TenantId) -> Result<Vec<UserId>, DialError>;
}
