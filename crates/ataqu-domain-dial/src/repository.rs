use crate::chat::Reaction;
use crate::chat::{Channel, ChannelId, Mention, Message, MessageId, Thread, ThreadId, UserId};
use crate::error::DialError;
use async_trait::async_trait;
use ataqu_kernel::TenantId;
use uuid::Uuid;

#[async_trait]
pub trait DialRepository: Send + Sync {
    async fn save_channel(&self, channel: &Channel) -> Result<(), DialError>;
    async fn archive_channel(
        &self,
        tenant_id: &TenantId,
        channel_id: &ChannelId,
        archived_at: std::time::SystemTime,
    ) -> Result<(), DialError>;
    async fn get_channel(
        &self,
        tenant_id: &TenantId,
        channel_id: &ChannelId,
    ) -> Result<Channel, DialError>;
    async fn insert_message(&self, message: &Message) -> Result<(), DialError>;
    async fn update_message_content(
        &self,
        tenant_id: &TenantId,
        message_id: &Uuid,
        new_content: &str,
        edited_at: std::time::SystemTime,
    ) -> Result<(), DialError>;
    async fn soft_delete_message(
        &self,
        tenant_id: &TenantId,
        message_id: &Uuid,
        deleted_at: std::time::SystemTime,
    ) -> Result<(), DialError>;
    async fn get_message(
        &self,
        tenant_id: &TenantId,
        message_id: &MessageId,
    ) -> Result<Message, DialError>;
    async fn insert_thread(&self, thread: &Thread) -> Result<(), DialError>;
    async fn insert_mention(&self, mention: &Mention) -> Result<(), DialError>;

    async fn delete_mentions_for_message(
        &self,
        _tenant_id: &TenantId,
        _message_id: &MessageId,
    ) -> Result<(), DialError> {
        Ok(())
    }

    async fn get_mentions_for_user(
        &self,
        tenant_id: &TenantId,
        user_id: &UserId,
    ) -> Result<Vec<Mention>, DialError>;
    async fn mark_mention_as_read(
        &self,
        tenant_id: &TenantId,
        mention_id: &Uuid,
        read_at: std::time::SystemTime,
    ) -> Result<(), DialError>;
    async fn list_channels(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Channel>, DialError>;

    async fn count_channels(&self, tenant_id: &TenantId) -> Result<u64, DialError>;
    async fn list_messages(
        &self,
        tenant_id: &TenantId,
        channel_id: &ChannelId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Message>, DialError>;

    async fn count_messages(
        &self,
        tenant_id: &TenantId,
        channel_id: &ChannelId,
    ) -> Result<u64, DialError>;
    async fn list_messages_for_thread(
        &self,
        tenant_id: &TenantId,
        thread_id: &ThreadId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Message>, DialError>;
    async fn get_thread(
        &self,
        tenant_id: &TenantId,
        thread_id: &ThreadId,
    ) -> Result<Thread, DialError>;
    async fn search_messages(
        &self,
        tenant_id: &TenantId,
        query: &str,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Message>, DialError>;

    async fn insert_reaction(&self, reaction: &Reaction) -> Result<(), DialError>;
    async fn list_reactions_for_message(
        &self,
        tenant_id: &TenantId,
        message_id: &MessageId,
    ) -> Result<Vec<Reaction>, DialError>;

    async fn get_reaction(
        &self,
        tenant_id: &TenantId,
        reaction_id: &Uuid,
    ) -> Result<Option<Reaction>, DialError>;

    async fn delete_reaction(
        &self,
        tenant_id: &TenantId,
        reaction_id: &Uuid,
    ) -> Result<(), DialError>;
}
