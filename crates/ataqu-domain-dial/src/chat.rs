use std::time::SystemTime;

use ataqu_kernel::{Clock, IdGenerator, Identifiable, TenantId};
use uuid::Uuid;

use crate::error::DialError;

// ============================================================================
// Constants
// ============================================================================

/// Maximum allowed length for a channel name (characters).
pub const MAX_CHANNEL_NAME_LEN: usize = 100;

/// Maximum allowed length for a message content (characters).
pub const MAX_MESSAGE_LEN: usize = 4_000;

/// Required number of participants for a direct message channel.
pub const DM_PARTICIPANT_COUNT: usize = 2;

// ============================================================================
// Identifier Newtypes
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct ChannelId(Uuid);

impl ChannelId {
    pub fn new(id: Uuid) -> Self {
        Self(id)
    }

    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

impl From<Uuid> for ChannelId {
    fn from(id: Uuid) -> Self {
        Self(id)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct MessageId(Uuid);

impl MessageId {
    pub fn new(id: Uuid) -> Self {
        Self(id)
    }

    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

impl From<Uuid> for MessageId {
    fn from(id: Uuid) -> Self {
        Self(id)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct ThreadId(Uuid);

impl ThreadId {
    pub fn new(id: Uuid) -> Self {
        Self(id)
    }

    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

impl From<Uuid> for ThreadId {
    fn from(id: Uuid) -> Self {
        Self(id)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub struct UserId(Uuid);

impl UserId {
    pub fn new(id: Uuid) -> Self {
        Self(id)
    }

    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

impl From<Uuid> for UserId {
    fn from(id: Uuid) -> Self {
        Self(id)
    }
}

// ============================================================================
// Enums
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChannelType {
    Public,
    Private,
    DirectMessage,
}

// ============================================================================
// Domain Entities
// ============================================================================

#[derive(Debug, Clone, PartialEq)]
pub struct Channel {
    pub id: ChannelId,
    pub tenant_id: TenantId,
    pub name: String,
    pub channel_type: ChannelType,
    pub created_by: UserId,
    pub participants: Vec<UserId>,
    pub created_at: SystemTime,
    pub archived_at: Option<SystemTime>,
}

impl Channel {
    pub fn is_archived(&self) -> bool {
        self.archived_at.is_some()
    }
}

impl Identifiable for Channel {
    fn id(&self) -> Uuid {
        self.id.as_uuid()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Message {
    pub id: MessageId,
    pub tenant_id: TenantId,
    pub channel_id: ChannelId,
    pub thread_id: Option<ThreadId>,
    pub author_id: UserId,
    pub content: String,
    pub created_at: SystemTime,
    pub edited_at: Option<SystemTime>,
    pub deleted_at: Option<SystemTime>,
}

impl Message {
    pub fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }

    pub fn is_edited(&self) -> bool {
        self.edited_at.is_some()
    }
}

impl Identifiable for Message {
    fn id(&self) -> Uuid {
        self.id.as_uuid()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Thread {
    pub id: ThreadId,
    pub tenant_id: TenantId,
    pub channel_id: ChannelId,
    pub parent_message_id: MessageId,
    pub created_at: SystemTime,
}

impl Identifiable for Thread {
    fn id(&self) -> Uuid {
        self.id.as_uuid()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Mention {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub message_id: MessageId,
    pub user_id: UserId,
    pub created_at: SystemTime,
    pub read_at: Option<SystemTime>,
}

impl Mention {
    pub fn is_read(&self) -> bool {
        self.read_at.is_some()
    }
}

impl Identifiable for Mention {
    fn id(&self) -> Uuid {
        self.id
    }
}

// ============================================================================
// Commands
// ============================================================================

#[derive(Debug, Clone)]
pub struct CreateChannelCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub channel_type: ChannelType,
    pub created_by: UserId,
    pub participants: Vec<UserId>,
}

#[derive(Debug, Clone)]
pub struct SendMessageCommand {
    pub tenant_id: TenantId,
    pub channel_id: ChannelId,
    pub thread_id: Option<ThreadId>,
    pub author_id: UserId,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct StartThreadCommand {
    pub tenant_id: TenantId,
    pub channel_id: ChannelId,
}

// ============================================================================
// Events
// ============================================================================

#[derive(Debug, Clone, PartialEq)]
pub struct ChannelCreatedEvent {
    pub channel_id: ChannelId,
    pub tenant_id: TenantId,
    pub name: String,
    pub channel_type: ChannelType,
    pub created_by: UserId,
    pub participants: Vec<UserId>,
    pub created_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChannelArchivedEvent {
    pub channel_id: ChannelId,
    pub tenant_id: TenantId,
    pub archived_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MessageSentEvent {
    pub message_id: MessageId,
    pub tenant_id: TenantId,
    pub channel_id: ChannelId,
    pub thread_id: Option<ThreadId>,
    pub author_id: UserId,
    pub content: String,
    pub mentioned_user_ids: Vec<UserId>,
    pub created_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MessageEditedEvent {
    pub message_id: MessageId,
    pub tenant_id: TenantId,
    pub channel_id: ChannelId,
    pub new_content: String,
    pub new_mentioned_user_ids: Vec<UserId>,
    pub edited_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MessageDeletedEvent {
    pub message_id: MessageId,
    pub tenant_id: TenantId,
    pub channel_id: ChannelId,
    pub deleted_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ThreadStartedEvent {
    pub thread_id: ThreadId,
    pub tenant_id: TenantId,
    pub channel_id: ChannelId,
    pub parent_message_id: MessageId,
    pub created_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MentionCreatedEvent {
    pub mention_id: Uuid,
    pub message_id: MessageId,
    pub tenant_id: TenantId,
    pub user_id: UserId,
    pub created_at: SystemTime,
}

// ============================================================================
// Pure Domain Functions
// ============================================================================

pub fn create_channel(
    cmd: CreateChannelCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<ChannelCreatedEvent, DialError> {
    validate_channel_name(&cmd.name)?;
    validate_channel_type(&cmd.channel_type, &cmd.participants)?;

    let channel_id = ChannelId::new(id_gen.new_uuid_v7());
    let created_at = clock.now();

    Ok(ChannelCreatedEvent {
        channel_id,
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        channel_type: cmd.channel_type,
        created_by: cmd.created_by,
        participants: cmd.participants,
        created_at,
    })
}

pub fn archive_channel(
    channel: &Channel,
    clock: &dyn Clock,
) -> Result<ChannelArchivedEvent, DialError> {
    if channel.is_archived() {
        return Err(DialError::ChannelAlreadyArchived);
    }

    Ok(ChannelArchivedEvent {
        channel_id: channel.id,
        tenant_id: channel.tenant_id,
        archived_at: clock.now(),
    })
}

pub fn send_message(
    cmd: SendMessageCommand,
    channel: &Channel,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<MessageSentEvent, DialError> {
    if channel.is_archived() {
        return Err(DialError::ChannelIsArchived);
    }

    validate_message_content(&cmd.content)?;

    let message_id = MessageId::new(id_gen.new_uuid_v7());
    let created_at = clock.now();
    let mentioned_user_ids = extract_mentions(&cmd.content);

    Ok(MessageSentEvent {
        message_id,
        tenant_id: cmd.tenant_id,
        channel_id: cmd.channel_id,
        thread_id: cmd.thread_id,
        author_id: cmd.author_id,
        content: cmd.content,
        mentioned_user_ids,
        created_at,
    })
}

pub fn edit_message(
    message: &Message,
    editor_id: UserId,
    new_content: String,
    clock: &dyn Clock,
) -> Result<MessageEditedEvent, DialError> {
    if message.author_id != editor_id {
        return Err(DialError::NotMessageAuthor);
    }

    validate_message_content(&new_content)?;

    let new_mentioned_user_ids = extract_mentions(&new_content);

    Ok(MessageEditedEvent {
        message_id: message.id,
        tenant_id: message.tenant_id,
        channel_id: message.channel_id,
        new_content,
        new_mentioned_user_ids,
        edited_at: clock.now(),
    })
}

pub fn delete_message(
    message: &Message,
    deleter_id: UserId,
    is_moderator: bool,
    clock: &dyn Clock,
) -> Result<MessageDeletedEvent, DialError> {
    if !is_moderator && message.author_id != deleter_id {
        return Err(DialError::NotMessageAuthor);
    }

    Ok(MessageDeletedEvent {
        message_id: message.id,
        tenant_id: message.tenant_id,
        channel_id: message.channel_id,
        deleted_at: clock.now(),
    })
}

pub fn start_thread(
    cmd: StartThreadCommand,
    parent_message: &Message,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<ThreadStartedEvent, DialError> {
    if parent_message.channel_id != cmd.channel_id {
        return Err(DialError::ThreadParentNotFound);
    }

    let thread_id = ThreadId::new(id_gen.new_uuid_v7());
    let created_at = clock.now();

    Ok(ThreadStartedEvent {
        thread_id,
        tenant_id: cmd.tenant_id,
        channel_id: cmd.channel_id,
        parent_message_id: parent_message.id,
        created_at,
    })
}

// ============================================================================
// Internal Validation & Helpers
// ============================================================================

fn validate_channel_name(name: &str) -> Result<(), DialError> {
    if name.trim().is_empty() {
        return Err(DialError::EmptyChannelName);
    }
    if name.chars().count() > MAX_CHANNEL_NAME_LEN {
        return Err(DialError::ChannelNameTooLong {
            max: MAX_CHANNEL_NAME_LEN,
        });
    }
    Ok(())
}

fn validate_message_content(content: &str) -> Result<(), DialError> {
    if content.trim().is_empty() {
        return Err(DialError::EmptyMessageContent);
    }
    if content.chars().count() > MAX_MESSAGE_LEN {
        return Err(DialError::MessageContentTooLong {
            max: MAX_MESSAGE_LEN,
        });
    }
    Ok(())
}

fn validate_channel_type(
    channel_type: &ChannelType,
    participants: &[UserId],
) -> Result<(), DialError> {
    if *channel_type == ChannelType::DirectMessage && participants.len() != DM_PARTICIPANT_COUNT {
        return Err(DialError::InvalidDmParticipantCount {
            count: participants.len(),
        });
    }
    Ok(())
}

fn extract_mentions(content: &str) -> Vec<UserId> {
    let mut mentions = Vec::new();
    let mut chars = content.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '@' {
            let mut id_str = String::new();
            while let Some(&next_c) = chars.peek() {
                if next_c.is_alphanumeric() || next_c == '-' {
                    id_str.push(next_c);
                    chars.next();
                } else {
                    break;
                }
            }

            if let Ok(uuid) = Uuid::parse_str(&id_str) {
                let user_id = UserId::new(uuid);
                if !mentions.contains(&user_id) {
                    mentions.push(user_id);
                }
            }
        }
    }

    mentions
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_kernel::{Clock, IdGenerator, TenantId};
    use std::time::{Duration, UNIX_EPOCH};

    struct MockIdGenerator;
    impl IdGenerator for MockIdGenerator {
        fn new_uuid_v7(&self) -> Uuid {
            Uuid::from_u128(1)
        }
    }

    struct MockClock;
    impl Clock for MockClock {
        fn now(&self) -> SystemTime {
            UNIX_EPOCH + Duration::from_secs(1000)
        }
    }

    fn tenant_id() -> TenantId {
        TenantId::new(Uuid::nil())
    }

    #[test]
    fn create_public_channel_success() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;
        let user_id = UserId::new(Uuid::nil());

        let cmd = CreateChannelCommand {
            tenant_id: tenant_id(),
            name: "General".to_string(),
            channel_type: ChannelType::Public,
            created_by: user_id,
            participants: vec![],
        };

        let event = create_channel(cmd, &id_gen, &clock).unwrap();
        assert_eq!(event.name, "General");
        assert_eq!(event.channel_type, ChannelType::Public);
    }

    #[test]
    fn create_dm_channel_success() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;
        let user1 = UserId::new(Uuid::nil());
        let user2 = UserId::new(Uuid::from_u128(1));

        let cmd = CreateChannelCommand {
            tenant_id: tenant_id(),
            name: "DM".to_string(),
            channel_type: ChannelType::DirectMessage,
            created_by: user1,
            participants: vec![user1, user2],
        };

        let event = create_channel(cmd, &id_gen, &clock).unwrap();
        assert_eq!(event.participants.len(), 2);
    }

    #[test]
    fn create_dm_channel_invalid_participants() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;
        let user1 = UserId::new(Uuid::nil());

        let cmd = CreateChannelCommand {
            tenant_id: tenant_id(),
            name: "DM".to_string(),
            channel_type: ChannelType::DirectMessage,
            created_by: user1,
            participants: vec![user1],
        };

        let result = create_channel(cmd, &id_gen, &clock);
        assert!(matches!(
            result,
            Err(DialError::InvalidDmParticipantCount { count: 1 })
        ));
    }

    #[test]
    fn create_channel_empty_name() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;
        let user_id = UserId::new(Uuid::nil());

        let cmd = CreateChannelCommand {
            tenant_id: tenant_id(),
            name: "   ".to_string(),
            channel_type: ChannelType::Public,
            created_by: user_id,
            participants: vec![],
        };

        let result = create_channel(cmd, &id_gen, &clock);
        assert!(matches!(result, Err(DialError::EmptyChannelName)));
    }

    #[test]
    fn create_channel_name_too_long() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;
        let user_id = UserId::new(Uuid::nil());

        let long_name = "a".repeat(MAX_CHANNEL_NAME_LEN + 1);
        let cmd = CreateChannelCommand {
            tenant_id: tenant_id(),
            name: long_name,
            channel_type: ChannelType::Public,
            created_by: user_id,
            participants: vec![],
        };

        let result = create_channel(cmd, &id_gen, &clock);
        assert!(matches!(
            result,
            Err(DialError::ChannelNameTooLong {
                max: MAX_CHANNEL_NAME_LEN
            })
        ));
    }

    #[test]
    fn archive_channel_success() {
        let clock = MockClock;
        let channel = Channel {
            id: ChannelId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            name: "General".to_string(),
            channel_type: ChannelType::Public,
            created_by: UserId::new(Uuid::nil()),
            participants: vec![],
            created_at: UNIX_EPOCH,
            archived_at: None,
        };

        let event = archive_channel(&channel, &clock).unwrap();
        assert_eq!(event.archived_at, UNIX_EPOCH + Duration::from_secs(1000));
    }

    #[test]
    fn archive_channel_already_archived() {
        let clock = MockClock;
        let channel = Channel {
            id: ChannelId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            name: "General".to_string(),
            channel_type: ChannelType::Public,
            created_by: UserId::new(Uuid::nil()),
            participants: vec![],
            created_at: UNIX_EPOCH,
            archived_at: Some(UNIX_EPOCH),
        };

        let result = archive_channel(&channel, &clock);
        assert!(matches!(result, Err(DialError::ChannelAlreadyArchived)));
    }

    #[test]
    fn send_message_success() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;

        let channel = Channel {
            id: ChannelId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            name: "General".to_string(),
            channel_type: ChannelType::Public,
            created_by: UserId::new(Uuid::nil()),
            participants: vec![],
            created_at: UNIX_EPOCH,
            archived_at: None,
        };

        let mentioned = Uuid::from_u128(123);
        let cmd = SendMessageCommand {
            tenant_id: tenant_id(),
            channel_id: channel.id,
            thread_id: None,
            author_id: UserId::new(Uuid::nil()),
            content: format!("Hello @{}", mentioned),
        };

        let event = send_message(cmd, &channel, &id_gen, &clock).unwrap();
        assert_eq!(event.content, format!("Hello @{}", mentioned));
        assert_eq!(event.mentioned_user_ids, vec![UserId::new(mentioned)]);
    }

    #[test]
    fn send_message_archived_channel() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;

        let channel = Channel {
            id: ChannelId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            name: "General".to_string(),
            channel_type: ChannelType::Public,
            created_by: UserId::new(Uuid::nil()),
            participants: vec![],
            created_at: UNIX_EPOCH,
            archived_at: Some(UNIX_EPOCH),
        };

        let cmd = SendMessageCommand {
            tenant_id: tenant_id(),
            channel_id: channel.id,
            thread_id: None,
            author_id: UserId::new(Uuid::nil()),
            content: "Hello".to_string(),
        };

        let result = send_message(cmd, &channel, &id_gen, &clock);
        assert!(matches!(result, Err(DialError::ChannelIsArchived)));
    }

    #[test]
    fn send_message_empty_content() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;

        let channel = Channel {
            id: ChannelId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            name: "General".to_string(),
            channel_type: ChannelType::Public,
            created_by: UserId::new(Uuid::nil()),
            participants: vec![],
            created_at: UNIX_EPOCH,
            archived_at: None,
        };

        let cmd = SendMessageCommand {
            tenant_id: tenant_id(),
            channel_id: channel.id,
            thread_id: None,
            author_id: UserId::new(Uuid::nil()),
            content: "   ".to_string(),
        };

        let result = send_message(cmd, &channel, &id_gen, &clock);
        assert!(matches!(result, Err(DialError::EmptyMessageContent)));
    }

    #[test]
    fn edit_message_success() {
        let clock = MockClock;
        let author = UserId::new(Uuid::nil());
        let message = Message {
            id: MessageId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            channel_id: ChannelId::new(Uuid::nil()),
            thread_id: None,
            author_id: author,
            content: "Old content".to_string(),
            created_at: UNIX_EPOCH,
            edited_at: None,
            deleted_at: None,
        };

        let event = edit_message(&message, author, "New content".to_string(), &clock).unwrap();
        assert_eq!(event.new_content, "New content");
    }

    #[test]
    fn edit_message_not_author() {
        let clock = MockClock;
        let author = UserId::new(Uuid::nil());
        let editor = UserId::new(Uuid::from_u128(1));
        let message = Message {
            id: MessageId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            channel_id: ChannelId::new(Uuid::nil()),
            thread_id: None,
            author_id: author,
            content: "Old content".to_string(),
            created_at: UNIX_EPOCH,
            edited_at: None,
            deleted_at: None,
        };

        let result = edit_message(&message, editor, "New content".to_string(), &clock);
        assert!(matches!(result, Err(DialError::NotMessageAuthor)));
    }

    #[test]
    fn delete_message_success() {
        let clock = MockClock;
        let author = UserId::new(Uuid::nil());
        let message = Message {
            id: MessageId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            channel_id: ChannelId::new(Uuid::nil()),
            thread_id: None,
            author_id: author,
            content: "Content".to_string(),
            created_at: UNIX_EPOCH,
            edited_at: None,
            deleted_at: None,
        };

        // Author can delete
        let event = delete_message(&message, author, false, &clock).unwrap();
        assert!(event.deleted_at > UNIX_EPOCH);

        // Moderator can delete
        let mod_id = UserId::new(Uuid::from_u128(999));
        let event = delete_message(&message, mod_id, true, &clock).unwrap();
        assert!(event.deleted_at > UNIX_EPOCH);
    }

    #[test]
    fn delete_message_not_author() {
        let clock = MockClock;
        let author = UserId::new(Uuid::nil());
        let other = UserId::new(Uuid::from_u128(1));
        let message = Message {
            id: MessageId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            channel_id: ChannelId::new(Uuid::nil()),
            thread_id: None,
            author_id: author,
            content: "Content".to_string(),
            created_at: UNIX_EPOCH,
            edited_at: None,
            deleted_at: None,
        };

        let result = delete_message(&message, other, false, &clock);
        assert!(matches!(result, Err(DialError::NotMessageAuthor)));
    }

    #[test]
    fn start_thread_success() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;
        let channel_id = ChannelId::new(Uuid::nil());
        let msg_id = MessageId::new(Uuid::nil());

        let parent = Message {
            id: msg_id,
            tenant_id: tenant_id(),
            channel_id,
            thread_id: None,
            author_id: UserId::new(Uuid::nil()),
            content: "Parent".to_string(),
            created_at: UNIX_EPOCH,
            edited_at: None,
            deleted_at: None,
        };

        let cmd = StartThreadCommand {
            tenant_id: tenant_id(),
            channel_id,
        };

        let event = start_thread(cmd, &parent, &id_gen, &clock).unwrap();
        assert_eq!(event.channel_id, channel_id);
        assert_eq!(event.parent_message_id, msg_id);
    }

    #[test]
    fn start_thread_parent_not_found() {
        let id_gen = MockIdGenerator;
        let clock = MockClock;

        let parent = Message {
            id: MessageId::new(Uuid::nil()),
            tenant_id: tenant_id(),
            channel_id: ChannelId::new(Uuid::nil()),
            thread_id: None,
            author_id: UserId::new(Uuid::nil()),
            content: "Parent".to_string(),
            created_at: UNIX_EPOCH,
            edited_at: None,
            deleted_at: None,
        };

        let cmd = StartThreadCommand {
            tenant_id: tenant_id(),
            channel_id: ChannelId::new(Uuid::from_u128(1)), // Different channel
        };

        let result = start_thread(cmd, &parent, &id_gen, &clock);
        assert!(matches!(result, Err(DialError::ThreadParentNotFound)));
    }

    #[test]
    fn extract_mentions_various_formats() {
        let u1 = Uuid::from_u128(1);
        let u2 = Uuid::from_u128(2);

        let content = format!("Hey @{} look at this! Also ping @{}.", u1, u2);
        let mentions = extract_mentions(&content);
        assert_eq!(mentions.len(), 2);
        assert!(mentions.contains(&UserId::new(u1)));
        assert!(mentions.contains(&UserId::new(u2)));

        let content_dup = format!("@{} @{} @{}", u1, u1, u2);
        let mentions = extract_mentions(&content_dup);
        assert_eq!(mentions.len(), 2); // Duplicates removed

        let content_invalid = "Email me at test@test.com";
        let mentions = extract_mentions(content_invalid);
        assert!(mentions.is_empty());
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Reaction {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub message_id: MessageId,
    pub user_id: UserId,
    pub emoji: String,
    pub created_at: SystemTime,
}
