//! DIAL repository implementations: messages and presence.

use std::sync::Arc;

use dashmap::{DashMap, DashSet};
use sea_orm::entity::prelude::*;
use sea_orm::{DatabaseTransaction, EntityTrait, Set};
use tracing::debug;
use uuid::Uuid;

use crate::batch::BatchResult;

// ----------------------------------------------------------------------
// Domain trait stubs (temporary – should be moved to ataqu-domain-dial)
// ----------------------------------------------------------------------
#[derive(Debug, Clone)]
pub struct Message {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub tenant_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    pub sent_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct MessageInsertCommand {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub tenant_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    pub sent_at: chrono::DateTime<chrono::Utc>,
}

pub type RepositoryError = sea_orm::DbErr;

#[async_trait::async_trait]
pub trait DialMessageRepository {
    async fn insert_messages(
        &self,
        txn: &mut DatabaseTransaction,
        commands: Vec<MessageInsertCommand>,
    ) -> Result<BatchResult<Message>, RepositoryError>;
}

#[async_trait::async_trait]
pub trait PresenceStore {
    async fn set_online(&self, tenant_id: Uuid, user_id: Uuid) -> Result<(), RepositoryError>;
    async fn set_offline(&self, tenant_id: Uuid, user_id: Uuid) -> Result<(), RepositoryError>;
    async fn get_online_users(&self, tenant_id: Uuid) -> Result<Vec<Uuid>, RepositoryError>;
}

// ----------------------------------------------------------------------
// SeaORM Entity (Model)
// ----------------------------------------------------------------------
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "messages", schema_name = "dial")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub channel_id: Uuid,
    pub tenant_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    pub sent_at: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

// ---- Mapper: Model -> domain Message ----
impl From<Model> for Message {
    fn from(model: Model) -> Self {
        Message {
            id: model.id,
            channel_id: model.channel_id,
            tenant_id: model.tenant_id,
            sender_id: model.sender_id,
            content: model.content,
            sent_at: model.sent_at,
        }
    }
}

// ----------------------------------------------------------------------
// DialMessageRepository implementation
// ----------------------------------------------------------------------
pub struct DialMessageRepositoryImpl;

impl DialMessageRepositoryImpl {
    pub fn new() -> Self {
        Self
    }
}

impl Default for DialMessageRepositoryImpl {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl DialMessageRepository for DialMessageRepositoryImpl {
    async fn insert_messages(
        &self,
        txn: &mut DatabaseTransaction,
        commands: Vec<MessageInsertCommand>,
    ) -> Result<BatchResult<Message>, RepositoryError> {
        // Collect IDs before moving commands
        let ids: Vec<Uuid> = commands.iter().map(|cmd| cmd.id).collect();

        let models: Vec<ActiveModel> = commands
            .into_iter()
            .map(|cmd| ActiveModel {
                id: Set(cmd.id),
                channel_id: Set(cmd.channel_id),
                tenant_id: Set(cmd.tenant_id),
                sender_id: Set(cmd.sender_id),
                content: Set(cmd.content),
                sent_at: Set(cmd.sent_at),
                created_at: Set(chrono::Utc::now()),
            })
            .collect();

        Entity::insert_many(models).exec(txn).await?;

        Ok(BatchResult {
            successes: ids,
            failures: Vec::new(),
        })
    }
}

// ----------------------------------------------------------------------
// InMemoryPresenceStore
// ----------------------------------------------------------------------
pub struct InMemoryPresenceStore {
    store: Arc<DashMap<Uuid, Arc<DashSet<Uuid>>>>, // tenant_id -> set of user_ids
}

impl InMemoryPresenceStore {
    pub fn new() -> Self {
        Self {
            store: Arc::new(DashMap::new()),
        }
    }
}

impl Default for InMemoryPresenceStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl PresenceStore for InMemoryPresenceStore {
    async fn set_online(&self, tenant_id: Uuid, user_id: Uuid) -> Result<(), RepositoryError> {
        let set = self
            .store
            .entry(tenant_id)
            .or_insert_with(|| Arc::new(DashSet::new()));
        set.insert(user_id);
        debug!(?tenant_id, ?user_id, "User online");
        Ok(())
    }

    async fn set_offline(&self, tenant_id: Uuid, user_id: Uuid) -> Result<(), RepositoryError> {
        if let Some(set) = self.store.get(&tenant_id) {
            set.remove(&user_id);
            debug!(?tenant_id, ?user_id, "User offline");
        }
        Ok(())
    }

    async fn get_online_users(&self, tenant_id: Uuid) -> Result<Vec<Uuid>, RepositoryError> {
        let users = self
            .store
            .get(&tenant_id)
            .map(|set| set.iter().map(|r| *r).collect::<Vec<Uuid>>())
            .unwrap_or_default();
        debug!(?tenant_id, count = users.len(), "Retrieved online users");
        Ok(users)
    }
}

// ----------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_presence_store() {
        let store = InMemoryPresenceStore::new();
        let tenant = Uuid::new_v4();
        let user1 = Uuid::new_v4();
        let user2 = Uuid::new_v4();

        assert!(store.get_online_users(tenant).await.unwrap().is_empty());

        store.set_online(tenant, user1).await.unwrap();
        store.set_online(tenant, user2).await.unwrap();
        let users = store.get_online_users(tenant).await.unwrap();
        assert_eq!(users.len(), 2);
        assert!(users.contains(&user1));
        assert!(users.contains(&user2));

        store.set_offline(tenant, user1).await.unwrap();
        let users = store.get_online_users(tenant).await.unwrap();
        assert_eq!(users.len(), 1);
        assert!(users.contains(&user2));

        let tenant2 = Uuid::new_v4();
        assert!(store.get_online_users(tenant2).await.unwrap().is_empty());
    }
}
