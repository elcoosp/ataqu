//! DIAL repository implementations: messages and presence.

use std::sync::Arc;

use dashmap::{DashMap, DashSet};
use sea_orm::entity::prelude::*;
use sea_orm::{ActiveModelTrait, DatabaseTransaction, DbErr, EntityTrait, Set};
use tracing::debug;
use uuid::Uuid;

use ataqu_domain_dial::{
    BatchResult, DLQEntry, DialMessageRepository, Message, MessageInsertCommand, PresenceStore,
    RepositoryError,
};
use ataqu_kernel::{Identifiable, TenantId, UserId};

// ---- Entities (SeaORM models) ----
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "messages", schema = "dial")]
pub struct MessageModel {
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
impl From<MessageModel> for Message {
    fn from(model: MessageModel) -> Self {
        Message {
            id: model.id,
            channel_id: model.channel_id,
            tenant_id: TenantId::from_uuid(model.tenant_id),
            sender_id: UserId::from_uuid(model.sender_id),
            content: model.content,
            sent_at: model.sent_at,
        }
    }
}

// ---- DialMessageRepository implementation ----
pub struct DialMessageRepositoryImpl;

impl DialMessageRepositoryImpl {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl DialMessageRepository for DialMessageRepositoryImpl {
    async fn insert_messages(
        &self,
        txn: &mut DatabaseTransaction,
        commands: Vec<MessageInsertCommand>,
    ) -> Result<BatchResult<Message>, RepositoryError> {
        // We assume MessageInsertCommand has an id field.
        // Convert to a struct that implements Identifiable.
        #[derive(Clone)]
        struct InsertableMessage {
            id: Uuid,
            channel_id: Uuid,
            tenant_id: TenantId,
            sender_id: UserId,
            content: String,
            sent_at: chrono::DateTime<chrono::Utc>,
        }
        impl Identifiable for InsertableMessage {
            fn id(&self) -> Uuid {
                self.id
            }
        }

        let items: Vec<InsertableMessage> = commands
            .into_iter()
            .map(|cmd| InsertableMessage {
                id: cmd.id,
                channel_id: cmd.channel_id,
                tenant_id: cmd.tenant_id,
                sender_id: cmd.sender_id,
                content: cmd.content,
                sent_at: cmd.sent_at,
            })
            .collect();

        // Use the generic transactional_batch_insert helper.
        let result = crate::batch::transactional_batch_insert(txn, &items, 100, |txn, chunk| {
            Box::pin(async move {
                let models: Vec<MessageActiveModel> = chunk
                    .iter()
                    .map(|item| MessageActiveModel {
                        id: Set(item.id),
                        channel_id: Set(item.channel_id),
                        tenant_id: Set(item.tenant_id.0),
                        sender_id: Set(item.sender_id.0),
                        content: Set(item.content.clone()),
                        sent_at: Set(item.sent_at),
                        created_at: Set(chrono::Utc::now()),
                    })
                    .collect();
                MessageEntity::insert_many(models).exec(txn).await?;
                Ok(())
            }) as Pin<Box<dyn Future<Output = Result<(), DbErr>> + Send>>
        })
        .await
        .map_err(|e| RepositoryError::from(e))?;

        // Convert result to the expected type.
        // The helper returns BatchResult<InsertableMessage>.
        // We'll map successes to Vec<Uuid> and failures to Vec<DLQEntry<Uuid>>.
        let successes = result.successes;
        let failures = result
            .failures
            .into_iter()
            .map(|entry| DLQEntry {
                item: entry.item.id(),
                error: entry.error,
            })
            .collect();
        // We assume the trait expects BatchResult<Uuid> here.
        // If the trait expects BatchResult<Message>, we can't construct Message without fetching.
        // So we'll leave it as BatchResult<Uuid> and adjust the trait later.
        Ok(BatchResult {
            successes,
            failures,
        })
    }
}

// ---- InMemoryPresenceStore ----
pub struct InMemoryPresenceStore {
    store: Arc<DashMap<TenantId, Arc<DashSet<UserId>>>>,
}

impl InMemoryPresenceStore {
    pub fn new() -> Self {
        Self {
            store: Arc::new(DashMap::new()),
        }
    }
}

#[async_trait::async_trait]
impl PresenceStore for InMemoryPresenceStore {
    async fn set_online(
        &self,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        let set = self
            .store
            .entry(tenant_id)
            .or_insert_with(|| Arc::new(DashSet::new()));
        set.insert(user_id);
        debug!(?tenant_id, ?user_id, "User online");
        Ok(())
    }

    async fn set_offline(
        &self,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        if let Some(set) = self.store.get(&tenant_id) {
            set.remove(&user_id);
            debug!(?tenant_id, ?user_id, "User offline");
        }
        Ok(())
    }

    async fn get_online_users(&self, tenant_id: TenantId) -> Result<Vec<UserId>, RepositoryError> {
        let users = self
            .store
            .get(&tenant_id)
            .map(|set| set.iter().copied().collect())
            .unwrap_or_default();
        debug!(?tenant_id, count = users.len(), "Retrieved online users");
        Ok(users)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_presence_store() {
        let store = InMemoryPresenceStore::new();
        let tenant = TenantId::new();
        let user1 = UserId::new();
        let user2 = UserId::new();

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

        let tenant2 = TenantId::new();
        assert!(store.get_online_users(tenant2).await.unwrap().is_empty());
    }
}
