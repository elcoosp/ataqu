//! DIAL application service – orchestrates chat operations using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use crate::outbox::Outbox;
use ataqu_domain_dial::chat::{
    self as dial_domain, ChannelId, ChannelType, CreateChannelCommand as DomainCreateChannel,
    Mention, MessageId, SendMessageCommand as DomainSendMessage,
    StartThreadCommand as DomainStartThread, Thread, ThreadId, UserId,
};
use ataqu_domain_dial::error::DialError;
use ataqu_domain_dial::presence::PresenceStore;
use ataqu_domain_dial::repository::DialRepository;
use ataqu_kernel::{Clock, IdGenerator, TenantId};

// Re-export domain types for API layer
pub use ataqu_domain_dial::chat::{Channel, Message, Reaction};

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
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl DialService {
    pub fn new(
        repo: Arc<dyn DialRepository + Send + Sync>,
        presence: Arc<dyn PresenceStore + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            repo,
            presence,
            outbox,
            id_gen,
            clock,
        }
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
        let event =
            dial_domain::create_channel(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())
                .map_err(DialServiceError::Domain)?;
        let channel = Channel {
            id: event.channel_id,
            tenant_id: event.tenant_id,
            name: event.name,
            channel_type: event.channel_type,
            created_by: event.created_by,
            participants: event.participants,
            created_at: event.created_at,
            updated_at: event.created_at,
            archived_at: None,
            version: 0,
        };
        self.repo.save_channel(&channel).await?;

        let payload = serde_json::json!({
            "channel_id": channel.id.as_uuid(),
            "tenant_id": channel.tenant_id.as_uuid(),
            "name": channel.name,
            "created_by": channel.created_by.as_uuid(),
        });
        self.outbox
            .append("dial", "ChannelCreated", channel.id.as_uuid(), &payload)
            .await
            .map_err(|e| DialServiceError::Repository(e))?;

        Ok(channel)
    }

    pub async fn archive_channel(&self, tenant_id: TenantId, channel_id: Uuid) -> DialResult<()> {
        let channel = self
            .repo
            .get_channel(&tenant_id, &ChannelId::new(channel_id))
            .await?;
        let event = dial_domain::archive_channel(&channel, self.clock.as_ref())
            .map_err(DialServiceError::Domain)?;
        self.repo
            .archive_channel(&tenant_id, &ChannelId::new(channel_id), event.archived_at)
            .await?;
        Ok(())
    }

    pub async fn update_channel(
        &self,
        tenant_id: TenantId,
        channel_id: Uuid,
        name: Option<String>,
        expected_version: i32,
    ) -> DialResult<Channel> {
        let mut channel = self
            .repo
            .get_channel(&tenant_id, &ChannelId::new(channel_id))
            .await?;

        if channel.version != expected_version {
            return Err(DialServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, channel.version
            )));
        }

        if let Some(n) = name {
            if n.trim().is_empty() {
                return Err(DialServiceError::Validation(
                    "Channel name cannot be empty".to_string(),
                ));
            }
            channel.name = n;
        }
        channel.version += 1;
        self.repo.save_channel(&channel).await?;
        Ok(channel)
    }

    pub async fn get_channel(
        &self,
        tenant_id: TenantId,
        channel_id: Uuid,
        requester_id: Uuid,
    ) -> DialResult<Channel> {
        let channel = self
            .repo
            .get_channel(&tenant_id, &ChannelId::new(channel_id))
            .await?;
        if (channel.channel_type == ChannelType::Private
            || channel.channel_type == ChannelType::DirectMessage)
            && !channel.participants.contains(&UserId::new(requester_id))
        {
            return Err(DialServiceError::Validation(
                "User is not a participant in this channel".to_string(),
            ));
        }
        Ok(channel)
    }

    pub async fn list_channels(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> DialResult<Vec<Channel>> {
        self.repo
            .list_channels(&tenant_id, limit, offset)
            .await
            .map_err(DialServiceError::Domain)
    }

    // -- Message methods --
    pub async fn send_message(&self, cmd: SendMessageCommand) -> DialResult<Message> {
        let channel_id = ChannelId::new(cmd.channel_id);
        let channel = self.repo.get_channel(&cmd.tenant_id, &channel_id).await?;

        if (channel.channel_type == ChannelType::Private
            || channel.channel_type == ChannelType::DirectMessage)
            && !channel.participants.contains(&UserId::new(cmd.author_id))
        {
            return Err(DialServiceError::Validation(
                "User is not a participant in this channel".to_string(),
            ));
        }

        let domain_cmd = DomainSendMessage {
            tenant_id: cmd.tenant_id,
            channel_id,
            thread_id: cmd.thread_id.map(ThreadId::new),
            author_id: UserId::new(cmd.author_id),
            content: cmd.content,
        };
        let event = dial_domain::send_message(
            domain_cmd,
            &channel,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        )
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
            version: 0,
        };
        self.repo.insert_message(&message).await?;

        // Fix: Persist mentions extracted by the domain function
        for user_id_str in &event.mentioned_user_ids {
            if user_id_str == "channel" {
                // Mention all participants
                for participant in &channel.participants {
                    let mention = Mention {
                        id: self.id_gen.new_uuid_v7(),
                        tenant_id: cmd.tenant_id,
                        message_id: event.message_id,
                        user_id: *participant,
                        created_at: self.clock.now(),
                        read_at: None,
                    };
                    self.repo.insert_mention(&mention).await?;
                }
            } else if let Ok(uuid) = Uuid::parse_str(user_id_str) {
                let mention = Mention {
                    id: self.id_gen.new_uuid_v7(),
                    tenant_id: cmd.tenant_id,
                    message_id: event.message_id,
                    user_id: UserId::new(uuid),
                    created_at: self.clock.now(),
                    read_at: None,
                };
                self.repo.insert_mention(&mention).await?;
            }
        }

        let payload = serde_json::json!({
            "message_id": message.id.as_uuid(),
            "tenant_id": message.tenant_id.as_uuid(),
            "channel_id": message.channel_id.as_uuid(),
            "author_id": message.author_id.as_uuid(),
            "content": message.content,
        });
        self.outbox
            .append("dial", "MessageSent", message.id.as_uuid(), &payload)
            .await
            .map_err(|e| DialServiceError::Repository(e))?;

        Ok(message)
    }

    pub async fn edit_message(
        &self,
        tenant_id: TenantId,
        message_id: Uuid,
        editor_id: Uuid,
        new_content: String,
        expected_version: i32,
    ) -> DialResult<Message> {
        let message = self
            .repo
            .get_message(&tenant_id, &MessageId::new(message_id))
            .await?;
        if message.version != expected_version {
            return Err(DialServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, message.version
            )));
        }
        let event = dial_domain::edit_message(
            &message,
            UserId::new(editor_id),
            new_content,
            self.clock.as_ref(),
        )
        .map_err(DialServiceError::Domain)?;
        self.repo
            .update_message_content(&tenant_id, &message_id, &event.new_content, event.edited_at)
            .await?;

        let channel = self
            .repo
            .get_channel(&tenant_id, &message.channel_id)
            .await?;

        // Persist new mentions extracted by the domain function
        for user_id_str in &event.new_mentioned_user_ids {
            if user_id_str == "channel" {
                // Mention all participants
                for participant in &channel.participants {
                    let mention = Mention {
                        id: self.id_gen.new_uuid_v7(),
                        tenant_id,
                        message_id: MessageId::new(message_id),
                        user_id: *participant,
                        created_at: self.clock.now(),
                        read_at: None,
                    };
                    self.repo.insert_mention(&mention).await?;
                }
            } else if let Ok(uuid) = Uuid::parse_str(user_id_str) {
                let mention = Mention {
                    id: self.id_gen.new_uuid_v7(),
                    tenant_id,
                    message_id: MessageId::new(message_id),
                    user_id: UserId::new(uuid),
                    created_at: self.clock.now(),
                    read_at: None,
                };
                self.repo.insert_mention(&mention).await?;
            }
        }

        self.get_message(tenant_id, message_id).await
    }

    pub async fn delete_message(
        &self,
        tenant_id: TenantId,
        message_id: Uuid,
        deleter_id: Uuid,
        is_moderator: bool,
    ) -> DialResult<()> {
        let message = self
            .repo
            .get_message(&tenant_id, &MessageId::new(message_id))
            .await?;
        let event = dial_domain::delete_message(
            &message,
            UserId::new(deleter_id),
            is_moderator,
            self.clock.as_ref(),
        )
        .map_err(DialServiceError::Domain)?;
        self.repo
            .soft_delete_message(&tenant_id, &message_id, event.deleted_at)
            .await?;
        Ok(())
    }

    pub async fn get_message(&self, tenant_id: TenantId, message_id: Uuid) -> DialResult<Message> {
        self.repo
            .get_message(&tenant_id, &MessageId::new(message_id))
            .await
            .map_err(DialServiceError::Domain)
    }

    pub async fn list_messages(
        &self,
        tenant_id: TenantId,
        channel_id: Uuid,
        requester_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> DialResult<Vec<Message>> {
        let channel_id_obj = ChannelId::new(channel_id);
        let channel = self.repo.get_channel(&tenant_id, &channel_id_obj).await?;
        if (channel.channel_type == ChannelType::Private
            || channel.channel_type == ChannelType::DirectMessage)
            && !channel.participants.contains(&UserId::new(requester_id))
        {
            return Err(DialServiceError::Validation(
                "User is not a participant in this channel".to_string(),
            ));
        }
        self.repo
            .list_messages(&tenant_id, &channel_id_obj, limit, offset)
            .await
            .map_err(DialServiceError::Domain)
    }

    pub async fn export_channel_messages(
        &self,
        tenant_id: TenantId,
        channel_id: Uuid,
        requester_id: Uuid,
    ) -> DialResult<String> {
        let messages = self
            .list_messages(tenant_id, channel_id, requester_id, 100000, 0)
            .await?;

        let mut wtr = csv::Writer::from_writer(vec![]);
        wtr.write_record(&[
            "message_id",
            "author_id",
            "content",
            "sent_at",
            "edited_at",
            "deleted_at",
        ])
        .map_err(|e| DialServiceError::Repository(e.to_string()))?;

        for msg in messages {
            wtr.write_record(&[
                msg.id.as_uuid().to_string(),
                msg.author_id.as_uuid().to_string(),
                msg.content,
                chrono::DateTime::<chrono::Utc>::from(msg.created_at).to_rfc3339(),
                msg.edited_at
                    .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339())
                    .unwrap_or_default(),
                msg.deleted_at
                    .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339())
                    .unwrap_or_default(),
            ])
            .map_err(|e| DialServiceError::Repository(e.to_string()))?;
        }

        let data = String::from_utf8(
            wtr.into_inner()
                .map_err(|e| DialServiceError::Repository(e.to_string()))?,
        )
        .map_err(|e| DialServiceError::Repository(e.to_string()))?;

        Ok(data)
    }

    pub async fn list_thread_messages(
        &self,
        tenant_id: TenantId,
        thread_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> DialResult<Vec<Message>> {
        // This assumes repo has a method to list by thread_id. Let's add it to repo trait if missing, or filter in service.
        // For now, let's filter via list_messages and filter. Better: add to repo trait.
        // I will add `list_messages_for_thread` to DialRepository trait.
        self.repo
            .list_messages_for_thread(&tenant_id, &ThreadId::new(thread_id), limit, offset)
            .await
            .map_err(DialServiceError::Domain)
    }

    // -- Thread methods --
    pub async fn start_thread(&self, cmd: StartThreadCommand) -> DialResult<Thread> {
        let channel_id = ChannelId::new(cmd.channel_id);
        let parent_message_id = MessageId::new(cmd.parent_message_id);
        let parent_message = self
            .repo
            .get_message(&cmd.tenant_id, &parent_message_id)
            .await?;
        let domain_cmd = DomainStartThread {
            tenant_id: cmd.tenant_id,
            channel_id,
        };
        let event = dial_domain::start_thread(
            domain_cmd,
            &parent_message,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        )
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
        self.repo
            .get_thread(&tenant_id, &ThreadId::new(thread_id))
            .await
            .map_err(DialServiceError::Domain)
    }

    // -- Mention methods --
    pub async fn add_mention(
        &self,
        tenant_id: TenantId,
        message_id: Uuid,
        user_id: Uuid,
    ) -> DialResult<Mention> {
        let message = self
            .repo
            .get_message(&tenant_id, &MessageId::new(message_id))
            .await?;
        let channel = self
            .repo
            .get_channel(&tenant_id, &message.channel_id)
            .await?;

        if !channel.participants.contains(&UserId::new(user_id)) {
            return Err(DialServiceError::Validation(
                "Mentioned user is not a participant in this channel".to_string(),
            ));
        }

        let mention = Mention {
            id: self.id_gen.new_uuid_v7(),
            tenant_id,
            message_id: MessageId::new(message_id),
            user_id: UserId::new(user_id),
            created_at: self.clock.now(),
            read_at: None,
        };
        self.repo.insert_mention(&mention).await?;
        Ok(mention)
    }

    pub async fn list_mentions(
        &self,
        tenant_id: TenantId,
        user_id: Uuid,
    ) -> DialResult<Vec<Mention>> {
        self.repo
            .get_mentions_for_user(&tenant_id, &UserId::new(user_id))
            .await
            .map_err(DialServiceError::Domain)
    }

    pub async fn mark_mention_as_read(
        &self,
        tenant_id: TenantId,
        mention_id: Uuid,
    ) -> DialResult<()> {
        self.repo
            .mark_mention_as_read(&tenant_id, &mention_id, self.clock.now())
            .await
            .map_err(DialServiceError::Domain)
    }

    // -- Presence methods --
    pub async fn set_online(
        &self,
        tenant_id: TenantId,
        user_id: Uuid,
    ) -> Result<(), DialServiceError> {
        use ataqu_domain_dial::presence::PresenceStatus;
        self.presence
            .set_presence(&tenant_id, &UserId::new(user_id), PresenceStatus::Online)
            .await
            .map_err(DialServiceError::Domain)
    }

    pub async fn set_offline(
        &self,
        tenant_id: TenantId,
        user_id: Uuid,
    ) -> Result<(), DialServiceError> {
        self.presence
            .remove_presence(&tenant_id, &UserId::new(user_id))
            .await
            .map_err(DialServiceError::Domain)
    }

    pub async fn get_online_users(
        &self,
        tenant_id: TenantId,
    ) -> Result<Vec<Uuid>, DialServiceError> {
        self.presence
            .get_online_users(&tenant_id)
            .await
            .map_err(DialServiceError::Domain)
            .map(|users| users.into_iter().map(|u| u.as_uuid()).collect())
    }

    // -- Search messages --
    pub async fn search_messages(
        &self,
        tenant_id: TenantId,
        query: &str,
        limit: u64,
        offset: u64,
    ) -> DialResult<Vec<Message>> {
        self.repo
            .search_messages(&tenant_id, query, limit, offset)
            .await
            .map_err(DialServiceError::Domain)
    }

    pub async fn add_reaction(
        &self,
        tenant_id: TenantId,
        message_id: Uuid,
        user_id: Uuid,
        emoji: String,
    ) -> DialResult<Reaction> {
        let reactions = self
            .repo
            .list_reactions_for_message(&tenant_id, &MessageId::new(message_id))
            .await?;

        if reactions
            .iter()
            .any(|r| r.user_id == UserId::new(user_id) && r.emoji == emoji)
        {
            return Err(DialServiceError::Validation(
                "Reaction already exists".to_string(),
            ));
        }

        let reaction = Reaction {
            id: self.id_gen.new_uuid_v7(),
            tenant_id,
            message_id: MessageId::new(message_id),
            user_id: UserId::new(user_id),
            emoji,
            created_at: self.clock.now(),
        };
        self.repo.insert_reaction(&reaction).await?;
        Ok(reaction)
    }

    pub async fn list_reactions(
        &self,
        tenant_id: TenantId,
        message_id: Uuid,
    ) -> DialResult<Vec<Reaction>> {
        self.repo
            .list_reactions_for_message(&tenant_id, &MessageId::new(message_id))
            .await
            .map_err(DialServiceError::Domain)
    }

    pub async fn delete_reaction(
        &self,
        tenant_id: TenantId,
        message_id: Uuid,
        reaction_id: Uuid,
    ) -> DialResult<()> {
        let reaction = self
            .repo
            .get_reaction(&tenant_id, &reaction_id)
            .await
            .map_err(DialServiceError::Domain)?
            .ok_or(DialServiceError::Validation(
                "Reaction not found".to_string(),
            ))?;

        if reaction.message_id.as_uuid() != message_id {
            return Err(DialServiceError::Validation(
                "Reaction does not belong to the specified message".to_string(),
            ));
        }

        self.repo
            .delete_reaction(&tenant_id, &reaction_id)
            .await
            .map_err(DialServiceError::Domain)
    }
}
