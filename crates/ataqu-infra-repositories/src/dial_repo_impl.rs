//! SeaORM + in-memory implementations for DIAL domain repositories.
use async_trait::async_trait;
use sea_orm::DatabaseConnection;
use uuid::Uuid;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::SystemTime;

use ataqu_kernel::TenantId;
use ataqu_domain_dial::chat::{Channel, ChannelId, Message, MessageId, Thread, ThreadId, Mention, UserId};
use ataqu_domain_dial::repository::DialRepository;
use ataqu_domain_dial::presence::{PresenceStore, PresenceStatus};
use ataqu_domain_dial::error::DialError;

// In-memory stores for the repository implementation (temporary)
pub struct InMemoryDialStore {
    channels: Arc<RwLock<HashMap<Uuid, Channel>>>,
    messages: Arc<RwLock<HashMap<Uuid, Message>>>,
    threads: Arc<RwLock<HashMap<Uuid, Thread>>>,
    mentions: Arc<RwLock<HashMap<Uuid, Mention>>>,
}

impl InMemoryDialStore {
    pub fn new() -> Self {
        Self {
            channels: Arc::new(RwLock::new(HashMap::new())),
            messages: Arc::new(RwLock::new(HashMap::new())),
            threads: Arc::new(RwLock::new(HashMap::new())),
            mentions: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

pub struct DialRepositoryImpl {
    db: DatabaseConnection,
    store: InMemoryDialStore,
}

impl DialRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            db,
            store: InMemoryDialStore::new(),
        }
    }
}

#[async_trait]
impl DialRepository for DialRepositoryImpl {
    async fn insert_channel(&self, channel: &Channel) -> Result<(), DialError> {
        let mut map = self.store.channels.write().unwrap();
        map.insert(channel.id.as_uuid(), channel.clone());
        Ok(())
    }

    async fn archive_channel(&self, tenant_id: &TenantId, channel_id: &ChannelId, archived_at: SystemTime) -> Result<(), DialError> {
        let mut map = self.store.channels.write().unwrap();
        if let Some(channel) = map.get_mut(&channel_id.as_uuid()) {
            if channel.tenant_id == *tenant_id {
                channel.archived_at = Some(archived_at);
                return Ok(());
            }
        }
        Err(DialError::Repository("Channel not found".to_string()))
    }

    async fn get_channel(&self, tenant_id: &TenantId, channel_id: &ChannelId) -> Result<Channel, DialError> {
        let map = self.store.channels.read().unwrap();
        map.get(&channel_id.as_uuid())
            .filter(|c| c.tenant_id == *tenant_id)
            .cloned()
            .ok_or_else(|| DialError::Repository("Channel not found".to_string()))
    }

    async fn insert_message(&self, message: &Message) -> Result<(), DialError> {
        let mut map = self.store.messages.write().unwrap();
        map.insert(message.id.as_uuid(), message.clone());
        Ok(())
    }

    async fn update_message_content(&self, tenant_id: &TenantId, message_id: &Uuid, new_content: &str, edited_at: SystemTime) -> Result<(), DialError> {
        let mut map = self.store.messages.write().unwrap();
        if let Some(msg) = map.get_mut(message_id) {
            if msg.tenant_id == *tenant_id {
                msg.content = new_content.to_string();
                msg.edited_at = Some(edited_at);
                return Ok(());
            }
        }
        Err(DialError::Repository("Message not found".to_string()))
    }

    async fn soft_delete_message(&self, tenant_id: &TenantId, message_id: &Uuid, deleted_at: SystemTime) -> Result<(), DialError> {
        let mut map = self.store.messages.write().unwrap();
        if let Some(msg) = map.get_mut(message_id) {
            if msg.tenant_id == *tenant_id {
                msg.deleted_at = Some(deleted_at);
                return Ok(());
            }
        }
        Err(DialError::Repository("Message not found".to_string()))
    }

    async fn get_message(&self, tenant_id: &TenantId, message_id: &MessageId) -> Result<Message, DialError> {
        let map = self.store.messages.read().unwrap();
        map.get(&message_id.as_uuid())
            .filter(|m| m.tenant_id == *tenant_id)
            .cloned()
            .ok_or_else(|| DialError::Repository("Message not found".to_string()))
    }

    async fn insert_thread(&self, thread: &Thread) -> Result<(), DialError> {
        let mut map = self.store.threads.write().unwrap();
        map.insert(thread.id.as_uuid(), thread.clone());
        Ok(())
    }

    async fn insert_mention(&self, mention: &Mention) -> Result<(), DialError> {
        let mut map = self.store.mentions.write().unwrap();
        map.insert(mention.id, mention.clone());
        Ok(())
    }

    async fn get_mentions_for_user(&self, tenant_id: &TenantId, user_id: &UserId) -> Result<Vec<Mention>, DialError> {
        let map = self.store.mentions.read().unwrap();
        let mentions = map.values()
            .filter(|m| m.tenant_id == *tenant_id && m.user_id.as_uuid() == user_id.as_uuid())
            .cloned()
            .collect();
        Ok(mentions)
    }

    async fn mark_mention_as_read(&self, tenant_id: &TenantId, mention_id: &Uuid, read_at: SystemTime) -> Result<(), DialError> {
        let mut map = self.store.mentions.write().unwrap();
        if let Some(mention) = map.get_mut(mention_id) {
            if mention.tenant_id == *tenant_id {
                mention.read_at = Some(read_at);
                return Ok(());
            }
        }
        Err(DialError::Repository("Mention not found".to_string()))
    }
}

// Presence store (in-memory with dashmap)
pub struct InMemoryPresenceStore {
    store: Arc<dashmap::DashMap<Uuid, dashmap::DashSet<Uuid>>>,
}

impl InMemoryPresenceStore {
    pub fn new() -> Self {
        Self {
            store: Arc::new(dashmap::DashMap::new()),
        }
    }
}

#[async_trait]
impl PresenceStore for InMemoryPresenceStore {
    async fn set_presence(&self, tenant_id: &TenantId, user_id: &UserId, status: PresenceStatus) -> Result<(), DialError> {
        if status == PresenceStatus::Online {
            self.store.entry(tenant_id.as_uuid())
                .or_insert_with(dashmap::DashSet::new)
                .insert(user_id.as_uuid());
        } else {
            if let Some(set) = self.store.get(&tenant_id.as_uuid()) {
                set.remove(&user_id.as_uuid());
            }
        }
        Ok(())
    }

    async fn get_presence(&self, _tenant_id: &TenantId, _user_id: &UserId) -> Result<Option<PresenceStatus>, DialError> {
        Ok(None)
    }

    async fn remove_presence(&self, tenant_id: &TenantId, user_id: &UserId) -> Result<(), DialError> {
        if let Some(set) = self.store.get(&tenant_id.as_uuid()) {
            set.remove(&user_id.as_uuid());
        }
        Ok(())
    }

    async fn get_online_users(&self, tenant_id: &TenantId) -> Result<Vec<UserId>, DialError> {
        let set = self.store.get(&tenant_id.as_uuid());
        let users = set.map(|s| s.iter().map(|id| UserId::new(*id)).collect()).unwrap_or_default();
        Ok(users)
    }
}
