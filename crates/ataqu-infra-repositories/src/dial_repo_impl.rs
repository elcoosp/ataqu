//! SeaORM-based repository implementation for DIAL domain.
use async_trait::async_trait;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, ActiveModelTrait, IntoActiveModel};
use sea_orm::QuerySelect;
use uuid::Uuid;
use std::time::SystemTime;
use chrono::{DateTime, Utc};

use ataqu_kernel::TenantId;
use ataqu_domain_dial::chat::{
    Channel, ChannelId, Message, MessageId, Thread, ThreadId, Mention, UserId, ChannelType,
};
use ataqu_domain_dial::repository::DialRepository;
use ataqu_domain_dial::presence::{PresenceStore, PresenceStatus};
use ataqu_domain_dial::error::DialError;

use crate::entities::dial::channel as channel_entity;
use crate::entities::dial::message as message_entity;
use crate::entities::dial::thread as thread_entity;
use crate::entities::dial::mention as mention_entity;
use crate::entities::dial::presence as presence_entity;

// ---------- Conversion helpers ----------
fn system_time_to_utc(st: SystemTime) -> DateTime<Utc> {
    st.into()
}

fn channel_type_to_str(ct: ChannelType) -> &'static str {
    match ct {
        ChannelType::Public => "public",
        ChannelType::Private => "private",
        ChannelType::DirectMessage => "direct_message",
    }
}

fn str_to_channel_type(s: &str) -> ChannelType {
    match s {
        "public" => ChannelType::Public,
        "private" => ChannelType::Private,
        "direct_message" => ChannelType::DirectMessage,
        _ => ChannelType::Public,
    }
}

fn channel_domain_to_active(channel: &Channel) -> channel_entity::ActiveModel {
    channel_entity::ActiveModel {
        id: Set(channel.id.as_uuid()),
        tenant_id: Set(channel.tenant_id.as_uuid()),
        name: Set(channel.name.clone()),
        channel_type: Set(channel_type_to_str(channel.channel_type).to_string()),
        created_by: Set(channel.created_by.as_uuid()),
        created_at: Set(system_time_to_utc(channel.created_at)),
        updated_at: Set(system_time_to_utc(channel.created_at)),
        archived_at: Set(channel.archived_at.map(system_time_to_utc)),
    }
}

fn channel_model_to_domain(model: channel_entity::Model) -> Channel {
    Channel {
        id: ChannelId::new(model.id),
        tenant_id: TenantId::new(model.tenant_id),
        name: model.name,
        channel_type: str_to_channel_type(&model.channel_type),
        created_by: UserId::new(model.created_by),
        participants: Vec::new(),
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
        let mut channel = channel_model_to_domain(model);
        channel.participants = Vec::new(); // not loading participants for simplicity
        Ok(channel)
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

    async fn list_channels(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> Result<Vec<Channel>, DialError> {
        let models = channel_entity::Entity::find()
            .filter(channel_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(models.into_iter().map(|m| {
            let mut channel = channel_model_to_domain(m);
            channel.participants = Vec::new();
            channel
        }).collect())
    }

    async fn list_messages(&self, tenant_id: &TenantId, channel_id: &ChannelId, limit: u64, offset: u64) -> Result<Vec<Message>, DialError> {
        let models = message_entity::Entity::find()
            .filter(message_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(message_entity::Column::ChannelId.eq(channel_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(models.into_iter().map(message_model_to_domain).collect())
    }

    async fn get_thread(&self, tenant_id: &TenantId, thread_id: &ThreadId) -> Result<Thread, DialError> {
        let model = thread_entity::Entity::find()
            .filter(thread_entity::Column::Id.eq(thread_id.as_uuid()))
            .filter(thread_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?
            .ok_or_else(|| DialError::Repository("Thread not found".to_string()))?;
        Ok(thread_model_to_domain(model))
    }

    async fn search_messages(&self, tenant_id: &TenantId, query: &str, limit: u64, offset: u64) -> Result<Vec<Message>, DialError> {
        let pattern = format!("%{}%", query);
        let models = message_entity::Entity::find()
            .filter(message_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(message_entity::Column::Content.ilike(&pattern))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(models.into_iter().map(message_model_to_domain).collect())
    }
}

// Presence store implementation remains unchanged
pub struct DbPresenceStore {
    db: DatabaseConnection,
}

impl DbPresenceStore {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl PresenceStore for DbPresenceStore {
    async fn set_presence(&self, tenant_id: &TenantId, user_id: &UserId, status: PresenceStatus) -> Result<(), DialError> {
        let status_str = match status {
            PresenceStatus::Online => "online",
            PresenceStatus::Away => "away",
            PresenceStatus::Offline => "offline",
        };
        let active = presence_entity::ActiveModel {
            tenant_id: Set(tenant_id.as_uuid()),
            user_id: Set(user_id.as_uuid()),
            status: Set(status_str.to_string()),
            last_seen: Set(Utc::now()),
        };
        let existing = presence_entity::Entity::find()
            .filter(presence_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(presence_entity::Column::UserId.eq(user_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        if let Some(model) = existing {
            let mut active_model = model.into_active_model();
            active_model.status = Set(status_str.to_string());
            active_model.last_seen = Set(Utc::now());
            active_model.update(&self.db).await.map_err(|e| DialError::Repository(e.to_string()))?;
        } else {
            presence_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| DialError::Repository(e.to_string()))?;
        }
        Ok(())
    }

    async fn get_presence(&self, tenant_id: &TenantId, user_id: &UserId) -> Result<Option<PresenceStatus>, DialError> {
        let model = presence_entity::Entity::find()
            .filter(presence_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(presence_entity::Column::UserId.eq(user_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(model.and_then(|m| match m.status.as_str() {
            "online" => Some(PresenceStatus::Online),
            "away" => Some(PresenceStatus::Away),
            _ => Some(PresenceStatus::Offline),
        }))
    }

    async fn remove_presence(&self, tenant_id: &TenantId, user_id: &UserId) -> Result<(), DialError> {
        presence_entity::Entity::delete_many()
            .filter(presence_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(presence_entity::Column::UserId.eq(user_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn get_online_users(&self, tenant_id: &TenantId) -> Result<Vec<UserId>, DialError> {
        let models = presence_entity::Entity::find()
            .filter(presence_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(presence_entity::Column::Status.eq("online"))
            .all(&self.db)
            .await
            .map_err(|e| DialError::Repository(e.to_string()))?;
        Ok(models.into_iter().map(|m| UserId::new(m.user_id)).collect())
    }
}
