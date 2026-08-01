use async_trait::async_trait;
use uuid::Uuid;

use ataqu_kernel::TenantId;

use crate::chat::{Channel, ChannelId, Mention, Message, Thread};
use crate::error::DialError;

/// Repository trait for DIAL domain persistence.
///
/// Implementations will use SeaORM entities and raw SQL. The trait methods
/// accept `TenantId` to enforce data isolation at the data access layer.
#[async_trait]
pub trait DialRepository: Send + Sync {
    /// Inserts a new channel.
    async fn insert_channel(&self, channel: &Channel) -> Result<(), DialError>;

    /// Marks a channel as archived.
    async fn archive_channel(
        &self,
        tenant_id: &TenantId,
        channel_id: &ChannelId,
        archived_at: std::time::SystemTime,
    ) -> Result<(), DialError>;

    /// Retrieves a channel by its ID.
    async fn get_channel(
        &self,
        tenant_id: &TenantId,
        channel_id: &ChannelId,
    ) -> Result<Channel, DialError>;

    /// Inserts a new message.
    async fn insert_message(&self, message: &Message) -> Result<(), DialError>;

    /// Updates an existing message's content and edited timestamp.
    async fn update_message_content(
        &self,
        tenant_id: &TenantId,
        message_id: &Uuid,
        new_content: &str,
        edited_at: std::time::SystemTime,
    ) -> Result<(), DialError>;

    /// Soft-deletes a message by setting the `deleted_at` timestamp.
    async fn soft_delete_message(
        &self,
        tenant_id: &TenantId,
        message_id: &Uuid,
        deleted_at: std::time::SystemTime,
    ) -> Result<(), DialError>;

    /// Retrieves a message by its ID.
    async fn get_message(
        &self,
        tenant_id: &TenantId,
        message_id: &Uuid,
    ) -> Result<Message, DialError>;

    /// Inserts a new thread.
    async fn insert_thread(&self, thread: &Thread) -> Result<(), DialError>;

    /// Inserts a new mention.
    async fn insert_mention(&self, mention: &Mention) -> Result<(), DialError>;

    /// Retrieves mentions for a specific user within a tenant.
    async fn get_mentions_for_user(
        &self,
        tenant_id: &TenantId,
        user_id: &Uuid,
    ) -> Result<Vec<Mention>, DialError>;

    /// Marks a mention as read.
    async fn mark_mention_as_read(
        &self,
        tenant_id: &TenantId,
        mention_id: &Uuid,
        read_at: std::time::SystemTime,
    ) -> Result<(), DialError>;
}
