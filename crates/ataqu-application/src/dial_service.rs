//! DIAL application service – orchestrates chat operations.
//! Uses in-memory repositories for now, but structured for later DB integration.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use ataqu_kernel::{Clock, IdGenerator, TenantId};

// Domain types (moved here for brevity; in production they come from domain crate)
#[derive(Debug, Clone, PartialEq)]
pub struct Channel {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Message {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub tenant_id: TenantId,
    pub sender_id: Uuid,
    pub content: String,
    pub sent_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateChannelCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub created_by: Uuid,
}

#[derive(Debug, Clone)]
pub struct SendMessageCommand {
    pub tenant_id: TenantId,
    pub channel_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
}

#[derive(Debug, thiserror::Error)]
pub enum DialServiceError {
    #[error("Channel not found")]
    ChannelNotFound,
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Internal error: {0}")]
    Internal(String),
}

pub type DialResult<T> = Result<T, DialServiceError>;

// In-memory repositories
#[derive(Default)]
struct ChannelStore {
    channels: Arc<RwLock<HashMap<Uuid, Channel>>>,
}

#[derive(Default)]
struct MessageStore {
    messages: Arc<RwLock<Vec<Message>>>,
}

pub struct DialService {
    channels: ChannelStore,
    messages: MessageStore,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl DialService {
    pub fn new(id_gen: Arc<dyn IdGenerator>, clock: Arc<dyn Clock>) -> Self {
        Self {
            channels: ChannelStore::default(),
            messages: MessageStore::default(),
            id_gen,
            clock,
        }
    }

    pub async fn create_channel(&self, cmd: CreateChannelCommand) -> DialResult<Channel> {
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let channel = Channel {
            id,
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            created_by: cmd.created_by,
            created_at: now,
        };
        self.channels.channels.write().unwrap().insert(id, channel.clone());
        Ok(channel)
    }

    pub async fn get_channel(&self, tenant_id: TenantId, channel_id: Uuid) -> DialResult<Channel> {
        let map = self.channels.channels.read().unwrap();
        map.get(&channel_id)
            .filter(|c| c.tenant_id == tenant_id)
            .cloned()
            .ok_or(DialServiceError::ChannelNotFound)
    }

    pub async fn list_channels(&self, tenant_id: TenantId) -> DialResult<Vec<Channel>> {
        let map = self.channels.channels.read().unwrap();
        let channels = map.values().filter(|c| c.tenant_id == tenant_id).cloned().collect();
        Ok(channels)
    }

    pub async fn send_message(&self, cmd: SendMessageCommand) -> DialResult<Message> {
        // Validate channel exists
        let _ = self.get_channel(cmd.tenant_id, cmd.channel_id).await?;
        if cmd.content.trim().is_empty() {
            return Err(DialServiceError::Validation("Message content cannot be empty".into()));
        }
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let msg = Message {
            id,
            channel_id: cmd.channel_id,
            tenant_id: cmd.tenant_id,
            sender_id: cmd.sender_id,
            content: cmd.content,
            sent_at: now,
        };
        self.messages.messages.write().unwrap().push(msg.clone());
        Ok(msg)
    }

    pub async fn list_messages(&self, tenant_id: TenantId, channel_id: Uuid) -> DialResult<Vec<Message>> {
        let _ = self.get_channel(tenant_id, channel_id).await?;
        let store = self.messages.messages.read().unwrap();
        let msgs = store.iter()
            .filter(|m| m.tenant_id == tenant_id && m.channel_id == channel_id)
            .cloned()
            .collect();
        Ok(msgs)
    }
}
