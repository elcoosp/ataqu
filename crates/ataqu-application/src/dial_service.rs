#![allow(unused_variables)]
// DIAL application service – orchestrates chat operations using domain repositories.
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
    audit_repo: Option<Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>>,
}

impl DialService {
    pub fn new(
        repo: Arc<dyn DialRepository + Send + Sync>,
        presence: Arc<dyn PresenceStore + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
        audit_repo: Option<
            Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>,
        >,
    ) -> Self {
        Self {
            repo,
            presence,
            outbox,
            id_gen,
            clock,
            audit_repo,
        }
    }

    // -- Channel methods --
    pub async fn create_channel(&self, user_id: Uuid, cmd: CreateChannelCommand) -> DialResult<Channel> {


        if cmd.channel_type == ChannelType::DirectMessage && cmd.participants.len() != 2 {
            return Err(DialServiceError::Validation(
                "Direct message channels must have exactly 2 participants".to_string(),
            ));
        }
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
            .map_err(DialServiceError::Repository)?;

        if let Some(audit_repo) = &self.audit_repo {
            audit_repo.append_log(
                channel.tenant_id,
                cmd.created_by,
                "create_channel",
                "dial",
                Some("channel"),
                Some(channel.id.as_uuid()),
                None,
                Some(serde_json::json!({"name": channel.name, "channel_type": format!("{:?}", channel.channel_type)})),
                None,
                None,
            ).await.ok();
        }

        Ok(channel)
    }

    pub async fn archive_channel(
        &self,
        tenant_id: TenantId,
        user_id: Uuid,
        channel_id: Uuid,
    ) -> DialResult<()> {


        let channel = self
            .repo
            .get_channel(&tenant_id, &ChannelId::new(channel_id))
            .await?;
        // [VULN-004] Check authorization
        if !channel.participants.contains(&UserId::new(user_id)) {
            return Err(DialServiceError::Validation(
                "User is not a participant in this channel".to_string(),
            ));
        }
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
        user_id: Uuid,
        channel_id: Uuid,
        name: Option<String>,
        expected_version: i32,
    ) -> DialResult<Channel> {


        let mut channel = self
            .repo
            .get_channel(&tenant_id, &ChannelId::new(channel_id))
            .await?;

        // [VULN-004] Check authorization
        if !channel.participants.contains(&UserId::new(user_id)) {
            return Err(DialServiceError::Validation(
                "User is not a participant in this channel".to_string(),
            ));
        }

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
            if n.chars().count() > dial_domain::MAX_CHANNEL_NAME_LEN {
                return Err(DialServiceError::Validation(
                    "Channel name too long".to_string(),
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
        user_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> DialResult<(Vec<Channel>, u64)> {
        // Note: Filtering at DB level is preferred, but requires repository trait changes.
        // We limit the query to a reasonable upper bound to prevent memory exhaustion.
        let max_channels = 5000;
        let all_channels = self.repo.list_channels(&tenant_id, max_channels, 0).await?;
        let filtered: Vec<Channel> = all_channels
            .into_iter()
            .filter(|c| {
                c.channel_type == ChannelType::Public
                    || c.participants.contains(&UserId::new(user_id))
            })
            .collect();
        let total = filtered.len() as u64;
        let items = filtered
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        Ok((items, total))
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
            if user_id_str == dial_domain::CHANNEL_MENTION {
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
            .map_err(DialServiceError::Repository)?;

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

        // Remove old mentions for this message
        self.repo
            .delete_mentions_for_message(&tenant_id, &MessageId::new(message_id))
            .await?;

        // Persist new mentions extracted by the domain function
        for user_id_str in &event.new_mentioned_user_ids {
            if user_id_str == dial_domain::CHANNEL_MENTION {
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

    pub async fn delete_message(&self, user_id: Uuid, tenant_id: TenantId,
        message_id: Uuid,
        deleter_id: Uuid,
        is_moderator: bool,) -> DialResult<()> {


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
    ) -> DialResult<(Vec<Message>, u64)> {
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
        let total = self
            .repo
            .count_messages(&tenant_id, &channel_id_obj)
            .await?;
        let messages = self
            .repo
            .list_messages(&tenant_id, &channel_id_obj, limit, offset)
            .await?;
        Ok((messages, total))
    }

    pub async fn export_channel_messages(
        &self,
        tenant_id: TenantId,
        channel_id: Uuid,
        requester_id: Uuid,
    ) -> DialResult<String> {
        let (messages, _total) = self
            .list_messages(tenant_id, channel_id, requester_id, 100000, 0)
            .await?;

        let mut wtr = csv::Writer::from_writer(vec![]);
        wtr.write_record([
            "message_id",
            "author_id",
            "content",
            "sent_at",
            "edited_at",
            "deleted_at",
        ])
        .map_err(|e| DialServiceError::Repository(e.to_string()))?;

        for msg in messages {
            wtr.write_record([
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

    pub async fn export_channel_pdf(
        &self,
        tenant_id: TenantId,
        channel_id: Uuid,
        requester_id: Uuid,
    ) -> DialResult<Vec<u8>> {
        let (messages, _total) = self
            .list_messages(tenant_id, channel_id, requester_id, 100000, 0)
            .await?;

        fn escape_pdf_text(s: &str) -> String {
            s.replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)")
        }

        let mut pages_content = Vec::new();
        let mut current_page_lines = Vec::new();
        current_page_lines.push(b"BT\n".to_vec());
        current_page_lines.push(b"/F1 12 Tf\n".to_vec());
        let mut y = 750.0;
        let title = format!("Channel export: {}", channel_id);
        current_page_lines.push(format!("1 0 0 1 50 {} Tm\n", y).into_bytes());
        current_page_lines.push(format!("({}) Tj\n", escape_pdf_text(&title)).into_bytes());
        y -= 25.0;

        for msg in messages {
            let line = format!(
                "[{}] {}: {}",
                chrono::DateTime::<chrono::Utc>::from(msg.created_at).to_rfc3339(),
                msg.author_id.as_uuid(),
                msg.content
            );
            let line: String = line.chars().take(200).collect();
            let line = line.as_str();

            if y < 50.0 {
                current_page_lines.push(b"ET\n".to_vec());
                pages_content.push(current_page_lines.concat());

                current_page_lines = Vec::new();
                current_page_lines.push(b"BT\n".to_vec());
                current_page_lines.push(b"/F1 12 Tf\n".to_vec());
                y = 750.0;
            }
            current_page_lines.push(format!("1 0 0 1 50 {} Tm\n", y).into_bytes());
            current_page_lines.push(format!("({}) Tj\n", escape_pdf_text(line)).into_bytes());
            y -= 15.0;
        }

        current_page_lines.push(b"ET\n".to_vec());
        pages_content.push(current_page_lines.concat());

        let mut buffer = Vec::new();
        buffer.extend_from_slice(b"%PDF-1.4\n");

        let mut object_offsets = Vec::new();
        let num_pages = pages_content.len();
        let total_objects = 1 + 1 + num_pages * 2; // pages, catalog, (content, page) * num_pages

        // Object 1: Pages
        object_offsets.push(buffer.len());
        buffer.extend_from_slice(b"1 0 obj\n");
        let mut kids = String::new();
        for i in 0..num_pages {
            kids.push_str(&format!("{} 0 R ", 3 + (i * 2) + 1));
        }
        buffer.extend_from_slice(
            format!("<< /Type /Pages /Kids [{}] /Count {} >>\n", kids, num_pages).as_bytes(),
        );
        buffer.extend_from_slice(b"endobj\n");

        // Object 2: Catalog
        object_offsets.push(buffer.len());
        buffer.extend_from_slice(b"2 0 obj\n");
        buffer.extend_from_slice(b"<< /Type /Catalog /Pages 1 0 R >>\n");
        buffer.extend_from_slice(b"endobj\n");

        // Objects 3...: Content and Page objects
        for (i, page_content) in pages_content.iter().enumerate() {
            let content_obj_num = 3 + (i * 2);
            let page_obj_num = content_obj_num + 1;

            // Content object
            object_offsets.push(buffer.len());
            buffer.extend_from_slice(format!("{} 0 obj\n", content_obj_num).as_bytes());
            buffer.extend_from_slice(format!("<< /Length {} >>\n", page_content.len()).as_bytes());
            buffer.extend_from_slice(b"stream\n");
            buffer.extend_from_slice(page_content);
            buffer.extend_from_slice(b"endstream\n");
            buffer.extend_from_slice(b"endobj\n");

            // Page object
            object_offsets.push(buffer.len());
            buffer.extend_from_slice(format!("{} 0 obj\n", page_obj_num).as_bytes());
            buffer.extend_from_slice(format!("<< /Type /Page /Parent 1 0 R /MediaBox [0 0 612 792] /Contents {} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\n", content_obj_num).as_bytes());
            buffer.extend_from_slice(b"endobj\n");
        }

        let xref_offset = buffer.len();
        buffer.extend_from_slice(b"xref\n");
        buffer.extend_from_slice(format!("0 {}\n", total_objects + 1).as_bytes());
        buffer.extend_from_slice(b"0000000000 65535 f \n");
        for offset in object_offsets {
            buffer.extend_from_slice(format!("{:010} 00000 n \n", offset).as_bytes());
        }

        buffer.extend_from_slice(
            format!(
                "trailer\n<< /Size {} /Root 2 0 R >>\nstartxref\n{}\n%%EOF\n",
                total_objects + 1,
                xref_offset
            )
            .as_bytes(),
        );

        Ok(buffer)
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
        user_id: Uuid,
        query: &str,
        limit: u64,
        offset: u64,
    ) -> DialResult<Vec<Message>> {
        // [VULN-002] Filter messages to only those in channels the user can access
        // Bound the query to prevent memory exhaustion
        let max_channels = 5000;
        let all_channels = self.repo.list_channels(&tenant_id, max_channels, 0).await?;
        let user_channels: std::collections::HashSet<ChannelId> = all_channels
            .into_iter()
            .filter(|c| {
                c.channel_type == ChannelType::Public
                    || c.participants.contains(&UserId::new(user_id))
            })
            .map(|c| c.id)
            .collect();

        let messages = self
            .repo
            .search_messages(&tenant_id, query, limit + offset, 0)
            .await?;
        Ok(messages
            .into_iter()
            .filter(|m| user_channels.contains(&m.channel_id))
            .skip(offset as usize)
            .take(limit as usize)
            .collect())
    }

    pub async fn add_reaction(
        &self,
        tenant_id: TenantId,
        message_id: Uuid,
        user_id: Uuid,
        emoji: String,
    ) -> DialResult<Reaction> {
        let message = self
            .repo
            .get_message(&tenant_id, &MessageId::new(message_id))
            .await?;
        let channel = self
            .repo
            .get_channel(&tenant_id, &message.channel_id)
            .await?;

        // [VULN-005] Check authorization
        if !channel.participants.contains(&UserId::new(user_id)) {
            return Err(DialServiceError::Validation(
                "User is not a participant in this channel".to_string(),
            ));
        }

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
        user_id: Uuid,
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

        // [VULN-005] Check ownership
        if reaction.user_id.as_uuid() != user_id {
            return Err(DialServiceError::Validation(
                "User does not own this reaction".to_string(),
            ));
        }

        self.repo
            .delete_reaction(&tenant_id, &reaction_id)
            .await
            .map_err(DialServiceError::Domain)
    }
}
