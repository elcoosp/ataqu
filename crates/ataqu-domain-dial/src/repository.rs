use async_trait::async_trait;
use uuid::Uuid;
use ataqu_kernel::TenantId;
use crate::chat::{Channel, ChannelId, Message, MessageId, Thread, ThreadId, Mention, UserId};
use crate::error::DialError;

#[async_trait]
pub trait DialRepository: Send + Sync {
    async fn insert_channel(&self, channel: &Channel) -> Result<(), DialError>;
    async fn archive_channel(&self, tenant_id: &TenantId, channel_id: &ChannelId, archived_at: std::time::SystemTime) -> Result<(), DialError>;
    async fn get_channel(&self, tenant_id: &TenantId, channel_id: &ChannelId) -> Result<Channel, DialError>;
    async fn insert_message(&self, message: &Message) -> Result<(), DialError>;
    async fn update_message_content(&self, tenant_id: &TenantId, message_id: &Uuid, new_content: &str, edited_at: std::time::SystemTime) -> Result<(), DialError>;
    async fn soft_delete_message(&self, tenant_id: &TenantId, message_id: &Uuid, deleted_at: std::time::SystemTime) -> Result<(), DialError>;
    async fn get_message(&self, tenant_id: &TenantId, message_id: &MessageId) -> Result<Message, DialError>;
    async fn insert_thread(&self, thread: &Thread) -> Result<(), DialError>;
    async fn insert_mention(&self, mention: &Mention) -> Result<(), DialError>;
    async fn get_mentions_for_user(&self, tenant_id: &TenantId, user_id: &UserId) -> Result<Vec<Mention>, DialError>;
    async fn mark_mention_as_read(&self, tenant_id: &TenantId, mention_id: &Uuid, read_at: std::time::SystemTime) -> Result<(), DialError>;
    async fn list_channels(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> Result<Vec<Channel>, DialError>;
    async fn list_messages(&self, tenant_id: &TenantId, channel_id: &ChannelId, limit: u64, offset: u64) -> Result<Vec<Message>, DialError>;
    async fn get_thread(&self, tenant_id: &TenantId, thread_id: &ThreadId) -> Result<Thread, DialError>;
    // New: search messages by content
    async fn search_messages(&self, tenant_id: &TenantId, query: &str, limit: u64, offset: u64) -> Result<Vec<Message>, DialError>;
}
