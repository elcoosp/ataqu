//! DIAL application service – orchestrates chat operations using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_domain_dial::chat::{
    self as dial_domain, ChannelId, MessageId, Thread, ThreadId,
    Mention, UserId, ChannelType,
    CreateChannelCommand as DomainCreateChannel,
    SendMessageCommand as DomainSendMessage,
    StartThreadCommand as DomainStartThread,
};
use ataqu_domain_dial::repository::DialRepository;
use ataqu_domain_dial::presence::PresenceStore;
use ataqu_domain_dial::error::DialError;

// Re-export domain types for API layer
pub use ataqu_domain_dial::chat::{Channel, Message};

// Application commands (using domain types)
#[derive(Debug, Clone)]
pub struct CreateChannelCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub channel_type: ChannelType,
    pub created_by: Uuid,
    pub participants: Vec<Uuid>,
}

#[derive(Debug, Clone)]
pub struct SendMessageCommand {
    pub tenant_id: TenantId,
    pub channel_id: Uuid,
    pub thread_id: Option<Uuid>,
    pub author_id: Uuid,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct StartThreadCommand {
    pub tenant_id: TenantId,
    pub channel_id: Uuid,
    pub parent_message_id: Uuid,
}

#[derive(Debug, thiserror::Error)]
pub enum DialServiceError {
    #[error("Channel not found")]
    ChannelNotFound,
    #[error("Message not found")]
    MessageNotFound,
    #[error("Thread not found")]
    ThreadNotFound,
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Domain error: {0}")]
    Domain(#[from] DialError),
    #[error("Repository error: {0}")]
    Repository(String),
}

pub type DialResult<T> = Result<T, DialServiceError>;

pub struct DialService {
    repo: Arc<dyn DialRepository + Send + Sync>,
    presence: Arc<dyn PresenceStore + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl DialService {
    pub fn new(
        repo: Arc<dyn DialRepository + Send + Sync>,
        presence: Arc<dyn PresenceStore + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self { repo, presence, id_gen, clock }
    }

    // -- Channel methods --
    pub async fn create_channel(&self, cmd: CreateChannelCommand) -> DialResult<Channel> {
        let participants: Vec<UserId> = cmd.participants.into_iter().map(UserId::new).collect();
        let domain_cmd = DomainCreateChannel {
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            channel_type: cmd.channel_type,
            created_by: UserId::new(cmd.created_by),
            participants,
        };
        let event = dial_domain::create_channel(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(DialServiceError::Domain)?;
        let channel = Channel {
            id: event.channel_id,
            tenant_id: event.tenant_id,
            name: event.name,
            channel_type: event.channel_type,
            created_by: event.created_by,
            participants: event.participants,
            created_at: event.created_at,
            archived_at: None,
        };
        self.repo.insert_channel(&channel).await?;
        Ok(channel)
    }

    pub async fn get_channel(&self, tenant_id: TenantId, channel_id: Uuid) -> DialResult<Channel> {
        self.repo.get_channel(&tenant_id, &ChannelId::new(channel_id)).await
            .map_err(DialServiceError::Domain)
    }

    pub async fn list_channels(&self, tenant_id: TenantId, limit: u64, offset: u64) -> DialResult<Vec<Channel>> {
        self.repo.list_channels(&tenant_id, limit, offset).await
            .map_err(|e| DialServiceError::Domain(e))
    }

    // -- Message methods --
    pub async fn send_message(&self, cmd: SendMessageCommand) -> DialResult<Message> {
        let channel_id = ChannelId::new(cmd.channel_id);
        let channel = self.repo.get_channel(&cmd.tenant_id, &channel_id).await?;
        let domain_cmd = DomainSendMessage {
            tenant_id: cmd.tenant_id,
            channel_id,
            thread_id: cmd.thread_id.map(ThreadId::new),
            author_id: UserId::new(cmd.author_id),
            content: cmd.content,
        };
        let event = dial_domain::send_message(domain_cmd, &channel, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(DialServiceError::Domain)?;
        let message = Message {
            id: event.message_id,
            tenant_id: event.tenant_id,
            channel_id: event.channel_id,
            thread_id: event.thread_id,
            author_id: event.author_id,
            content: event.content,
            created_at: event.created_at,
            edited_at: None,
            deleted_at: None,
        };
        self.repo.insert_message(&message).await?;
        Ok(message)
    }

    pub async fn list_messages(&self, tenant_id: TenantId, channel_id: Uuid, limit: u64, offset: u64) -> DialResult<Vec<Message>> {
        let channel_id_obj = ChannelId::new(channel_id);
        self.repo.list_messages(&tenant_id, &channel_id_obj, limit, offset).await
            .map_err(|e| DialServiceError::Domain(e))
    }

    // -- Thread methods --
    pub async fn start_thread(&self, cmd: StartThreadCommand) -> DialResult<Thread> {
        let channel_id = ChannelId::new(cmd.channel_id);
        let parent_message_id = MessageId::new(cmd.parent_message_id);
        let parent_message = self.repo.get_message(&cmd.tenant_id, &parent_message_id).await?;
        let domain_cmd = DomainStartThread {
            tenant_id: cmd.tenant_id,
            channel_id,
        };
        let event = dial_domain::start_thread(domain_cmd, &parent_message, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(DialServiceError::Domain)?;
        let thread = Thread {
            id: event.thread_id,
            tenant_id: event.tenant_id,
            channel_id: event.channel_id,
            parent_message_id: event.parent_message_id,
            created_at: event.created_at,
        };
        self.repo.insert_thread(&thread).await?;
        Ok(thread)
    }

    pub async fn get_thread(&self, tenant_id: TenantId, thread_id: Uuid) -> DialResult<Thread> {
        self.repo.get_thread(&tenant_id, &ThreadId::new(thread_id)).await
            .map_err(|e| DialServiceError::Domain(e))
    }

    // -- Mention methods --
    pub async fn add_mention(&self, tenant_id: TenantId, message_id: Uuid, user_id: Uuid) -> DialResult<Mention> {
        let mention = Mention {
            id: Uuid::new_v4(),
            tenant_id,
            message_id: MessageId::new(message_id),
            user_id: UserId::new(user_id),
            created_at: self.clock.now(),
            read_at: None,
        };
        self.repo.insert_mention(&mention).await?;
        Ok(mention)
    }

    pub async fn list_mentions(&self, tenant_id: TenantId, user_id: Uuid) -> DialResult<Vec<Mention>> {
        self.repo.get_mentions_for_user(&tenant_id, &UserId::new(user_id)).await
            .map_err(|e| DialServiceError::Domain(e))
    }

    // -- Presence methods --
    pub async fn set_online(&self, tenant_id: TenantId, user_id: Uuid) -> Result<(), DialServiceError> {
        use ataqu_domain_dial::presence::PresenceStatus;
        self.presence.set_presence(&tenant_id, &UserId::new(user_id), PresenceStatus::Online).await
            .map_err(DialServiceError::Domain)
    }

    pub async fn set_offline(&self, tenant_id: TenantId, user_id: Uuid) -> Result<(), DialServiceError> {
        self.presence.remove_presence(&tenant_id, &UserId::new(user_id)).await
            .map_err(DialServiceError::Domain)
    }

    pub async fn get_online_users(&self, tenant_id: TenantId) -> Result<Vec<Uuid>, DialServiceError> {
        self.presence.get_online_users(&tenant_id).await
            .map_err(DialServiceError::Domain)
            .map(|users| users.into_iter().map(|u| u.as_uuid()).collect())
    }
}
