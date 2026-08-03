//! SeaORM-based repository implementation for DIAL domain.
use async_trait::async_trait;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, ActiveModelTrait, IntoActiveModel};
use uuid::Uuid;
use std::time::SystemTime;
use chrono::{DateTime, Utc};

use ataqu_kernel::TenantId;
use ataqu_domain_dial::chat::{
    Channel, ChannelId, Message, MessageId, Thread, ThreadId, Mention, UserId,
};
use ataqu_domain_dial::repository::DialRepository;
use ataqu_domain_dial::presence::{PresenceStore, PresenceStatus};
use ataqu_domain_dial::error::DialError;

// Import SeaORM entity modules
use crate::entities::dial::channel as channel_entity;
use crate::entities::dial::message as message_entity;
use crate::entities::dial::thread as thread_entity;
use crate::entities::dial::mention as mention_entity;

// ---------- Conversion helpers ----------

fn system_time_to_utc(st: SystemTime) -> DateTime<Utc> {
    st.into()
}

fn channel_domain_to_active(channel: &Channel) -> channel_entity::ActiveModel {
    channel_entity::ActiveModel {
        id: Set(channel.id.as_uuid()),
        tenant_id: Set(channel.tenant_id.as_uuid()),
        name: Set(channel.name.clone()),
        created_by: Set(channel.created_by.as_uuid()),
        created_at: Set(system_time_to_utc(channel.created_at)),
        updated_at: Set(system_time_to_utc(channel.created_at)), // initially same
        archived_at: Set(channel.archived_at.map(system_time_to_utc)),
    }
}

fn channel_model_to_domain(model: channel_entity::Model) -> Channel {
    // We need to store channel_type in the DB; for now we default to Public.
    // We'll add a column later.
    Channel {
        id: ChannelId::new(model.id),
        tenant_id: TenantId::new(model.tenant_id),
        name: model.name,
        channel_type: ataqu_domain_dial::chat::ChannelType::Public,
        created_by: UserId::new(model.created_by),
        participants: Vec::new(), // not stored yet
        created_at: model.created_at.into(),
        archived_at: model.archived_at.map(|dt| dt.into()),
    }
}

fn message_domain_to_active(message: &Message) -> message_entity::ActiveModel {
    message_entity::ActiveModel {
        id: Set(message.id.as_uuid()),
        channel_id: Set(message.channel_id.as_uuid()),
        tenant_id: Set(message.tenant_id.as_uuid()),
        author_id: Set(message.author_id.as_uuid()),
        content: Set(message.content.clone()),
        sent_at: Set(system_time_to_utc(message.created_at)),
        edited_at: Set(message.edited_at.map(system_time_to_utc)),
        deleted_at: Set(message.deleted_at.map(system_time_to_utc)),
        thread_id: Set(message.thread_id.map(|tid| tid.as_uuid())),
    }
}

fn message_model_to_domain(model: message_entity::Model) -> Message {
    Message {
        id: MessageId::new(model.id),
        tenant_id: TenantId::new(model.tenant_id),
        channel_id: ChannelId::new(model.channel_id),
        thread_id: model.thread_id.map(ThreadId::new),
        author_id: UserId::new(model.author_id),
        content: model.content,
        created_at: model.sent_at.into(),
        edited_at: model.edited_at.map(|dt| dt.into()),
        deleted_at: model.deleted_at.map(|dt| dt.into()),
    }
}

fn thread_domain_to_active(thread: &Thread) -> thread_entity::ActiveModel {
    thread_entity::ActiveModel {
        id: Set(thread.id.as_uuid()),
        tenant_id: Set(thread.tenant_id.as_uuid()),
        channel_id: Set(thread.channel_id.as_uuid()),
        parent_message_id: Set(thread.parent_message_id.as_uuid()),
        created_at: Set(system_time_to_utc(thread.created_at)),
    }
}

fn thread_model_to_domain(model: thread_entity::Model) -> Thread {
    Thread {
        id: ThreadId::new(model.id),
        tenant_id: TenantId::new(model.tenant_id),
        channel_id: ChannelId::new(model.channel_id),
        parent_message_id: MessageId::new(model.parent_message_id),
        created_at: model.created_at.into(),
    }
}

fn mention_domain_to_active(mention: &Mention) -> mention_entity::ActiveModel {
    mention_entity::ActiveModel {
        id: Set(mention.id),
        tenant_id: Set(mention.tenant_id.as_uuid()),
        message_id: Set(mention.message_id.as_uuid()),
        user_id: Set(mention.user_id.as_uuid()),
        read_at: Set(mention.read_at.map(system_time_to_utc)),
        created_at: Set(system_time_to_utc(mention.created_at)),
    }
}

fn mention_model_to_domain(model: mention_entity::Model) -> Mention {
    Mention {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        message_id: MessageId::new(model.message_id),
        user_id: UserId::new(model.user_id),
        read_at: model.read_at.map(|dt| dt.into()),
        created_at: model.created_at.into(),
    }
}

// ---------- Repository Implementation ----------
pub struct DialRepositoryImpl {
    db: DatabaseConnection,
}

impl DialRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl DialRepository for DialRepositoryImpl {
    async fn insert_channel(&self, channel: &Channel) -> Result<(), DialError> {
        let active = channel_domain_to_active(channel);
        channel_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn archive_channel(&self, tenant_id: &TenantId, channel_id: &ChannelId, archived_at: SystemTime) -> Result<(), DialError> {
        let archived_dt = system_time_to_utc(archived_at);
        let mut active = channel_entity::Entity::find()
            .filter(channel_entity::Column::Id.eq(channel_id.as_uuid()))
            .filter(channel_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?
            .ok_or_else(|| DialError::Repository("Channel not found".to_string()))?
            .into_active_model();
        active.archived_at = Set(Some(archived_dt));
        active.update(&self.db).await.map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn get_channel(&self, tenant_id: &TenantId, channel_id: &ChannelId) -> Result<Channel, DialError> {
        let model = channel_entity::Entity::find()
            .filter(channel_entity::Column::Id.eq(channel_id.as_uuid()))
            .filter(channel_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?
            .ok_or_else(|| DialError::Repository("Channel not found".to_string()))?;
        Ok(channel_model_to_domain(model))
    }

    async fn insert_message(&self, message: &Message) -> Result<(), DialError> {
        let active = message_domain_to_active(message);
        message_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn update_message_content(&self, tenant_id: &TenantId, message_id: &Uuid, new_content: &str, edited_at: SystemTime) -> Result<(), DialError> {
        let edited_dt = system_time_to_utc(edited_at);
        let mut active = message_entity::Entity::find()
            .filter(message_entity::Column::Id.eq(*message_id))
            .filter(message_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?
            .ok_or_else(|| DialError::Repository("Message not found".to_string()))?
            .into_active_model();
        active.content = Set(new_content.to_string());
        active.edited_at = Set(Some(edited_dt));
        active.update(&self.db).await.map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn soft_delete_message(&self, tenant_id: &TenantId, message_id: &Uuid, deleted_at: SystemTime) -> Result<(), DialError> {
        let deleted_dt = system_time_to_utc(deleted_at);
        let mut active = message_entity::Entity::find()
            .filter(message_entity::Column::Id.eq(*message_id))
            .filter(message_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?
            .ok_or_else(|| DialError::Repository("Message not found".to_string()))?
            .into_active_model();
        active.deleted_at = Set(Some(deleted_dt));
        active.update(&self.db).await.map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn get_message(&self, tenant_id: &TenantId, message_id: &MessageId) -> Result<Message, DialError> {
        let model = message_entity::Entity::find()
            .filter(message_entity::Column::Id.eq(message_id.as_uuid()))
            .filter(message_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?
            .ok_or_else(|| DialError::Repository("Message not found".to_string()))?;
        Ok(message_model_to_domain(model))
    }

    async fn insert_thread(&self, thread: &Thread) -> Result<(), DialError> {
        let active = thread_domain_to_active(thread);
        thread_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn insert_mention(&self, mention: &Mention) -> Result<(), DialError> {
        let active = mention_domain_to_active(mention);
        mention_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn get_mentions_for_user(&self, tenant_id: &TenantId, user_id: &UserId) -> Result<Vec<Mention>, DialError> {
        let models = mention_entity::Entity::find()
            .filter(mention_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(mention_entity::Column::UserId.eq(user_id.as_uuid()))
            .all(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(models.into_iter().map(mention_model_to_domain).collect())
    }

    async fn mark_mention_as_read(&self, tenant_id: &TenantId, mention_id: &Uuid, read_at: SystemTime) -> Result<(), DialError> {
        let read_dt = system_time_to_utc(read_at);
        let mut active = mention_entity::Entity::find()
            .filter(mention_entity::Column::Id.eq(*mention_id))
            .filter(mention_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?
            .ok_or_else(|| DialError::Repository("Mention not found".to_string()))?
            .into_active_model();
        active.read_at = Set(Some(read_dt));
        active.update(&self.db).await.map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(())
    }
}

// ---------- Presence Store (In-memory – can be replaced with Redis later) ----------
pub struct InMemoryPresenceStore {
    store: std::sync::Arc<dashmap::DashMap<Uuid, dashmap::DashSet<Uuid>>>,
}

impl InMemoryPresenceStore {
    pub fn new() -> Self {
        Self {
            store: std::sync::Arc::new(dashmap::DashMap::new()),
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
        Ok(None) // we could implement, but not needed for now
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
