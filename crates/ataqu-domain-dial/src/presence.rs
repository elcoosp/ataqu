use async_trait::async_trait;

use crate::chat::UserId;
use crate::error::DialError;
use ataqu_kernel::TenantId;

/// Defines the online/offline presence state of a user.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PresenceStatus {
    Online,
    Away,
    Offline,
}

/// A pure representation of a user's presence state.
#[derive(Debug, Clone, PartialEq)]
pub struct Presence {
    pub user_id: UserId,
    pub tenant_id: TenantId,
    pub status: PresenceStatus,
}

/// Trait for storing and retrieving user presence.
///
/// (ADR-028): This trait operates purely on `TenantId` and `UserId`.
/// Infrastructure layers must maintain the mapping to internal connection
/// identifiers (e.g., `ConnectionId`) themselves. No such identifier
/// should appear in this domain trait.
#[async_trait]
pub trait PresenceStore: Send + Sync {
    /// Sets the presence status for a specific user within a tenant.
    async fn set_presence(
        &self,
        tenant_id: &TenantId,
        user_id: &UserId,
        status: PresenceStatus,
    ) -> Result<(), DialError>;

    /// Retrieves the presence status for a specific user within a tenant.
    async fn get_presence(
        &self,
        tenant_id: &TenantId,
        user_id: &UserId,
    ) -> Result<Option<PresenceStatus>, DialError>;

    /// Removes the presence state for a user (e.g., on disconnect).
    async fn remove_presence(
        &self,
        tenant_id: &TenantId,
        user_id: &UserId,
    ) -> Result<(), DialError>;

    /// Retrieves all online users for a specific tenant.
    async fn get_online_users(&self, tenant_id: &TenantId) -> Result<Vec<UserId>, DialError>;
}
