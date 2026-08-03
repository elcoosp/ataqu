//! DIAL service orchestration – application layer.
//!
//! Implements the `DialService` which orchestrates:
//! - Batch message ingestion via `transactional_batch_insert`
//! - Presence updates via `PresenceStore`
//! - Strict idempotency flow (ADR‑006, ADR‑017)
//!
//! All dependencies are injected; domain and infra layers are used via traits.

use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::DatabaseTransaction;
use thiserror::Error;
use tracing::{debug, info, instrument};
use uuid::Uuid;

// Domain & infra imports (these are assumed to exist)
use ataqu_domain_dial::{
    commands::SendMessageBatchCommand,
    entities::Message,
    presence::PresenceStore,
    repositories::MessageRepository,
    DialDomainError,
};
use ataqu_infra_idempotency::{IdempotencyError, IdempotencyGuard};
use ataqu_kernel::{Clock, IdGenerator, TenantId, UserId};

// -----------------------------------------------------------------------------
// Service Error
// -----------------------------------------------------------------------------

/// Errors that can occur during DIAL orchestration.
#[derive(Debug, Error)]
pub enum DialServiceError {
    #[error("Domain error: {0}")]
    Domain(#[from] DialDomainError),

    #[error("Idempotency error: {0}")]
    Idempotency(#[from] IdempotencyError),

    #[error("Repository error: {0}")]
    Repository(Box<dyn std::error::Error + Send + Sync>),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Presence error: {0}")]
    Presence(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

pub type DialServiceResult<T> = Result<T, DialServiceError>;

// -----------------------------------------------------------------------------
// Service Definition
// -----------------------------------------------------------------------------

/// Application service for DIAL (chat) operations.
///
/// Orchestrates message persistence and presence, following the
/// idempotency‑first flow mandated by ADR‑006 and ADR‑017.
#[derive(Clone)]
pub struct DialService {
    idempotency_guard: Arc<dyn IdempotencyGuard>,
    message_repo: Arc<dyn MessageRepository>,
    presence_store: Arc<dyn PresenceStore>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl DialService {
    pub fn new(
        idempotency_guard: Arc<dyn IdempotencyGuard>,
        message_repo: Arc<dyn MessageRepository>,
        presence_store: Arc<dyn PresenceStore>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            idempotency_guard,
            message_repo,
            presence_store,
            id_gen,
            clock,
        }
    }

    // -------------------------------------------------------------------------
    // Message ingestion (batch)
    // -------------------------------------------------------------------------

    /// Ingests a batch of messages for a given tenant.
    ///
    /// # Idempotency
    ///
    /// The entire batch is wrapped in an idempotency guard keyed by a
    /// deterministic `command_id` derived from the batch command.
    ///
    /// # Flow (ADR‑017)
    ///
    /// 1. Domain pure function transforms each command into a `Message` entity.
    /// 2. Repository persists the messages using `transactional_batch_insert`.
    /// 3. Idempotency guard stores the response and caches it.
    #[instrument(skip(self), fields(tenant_id = %tenant_id, command_id = %idempotency_key))]
    pub async fn send_messages(
        &self,
        tenant_id: TenantId,
        command: SendMessageBatchCommand,
        idempotency_key: Uuid, // already mapped to command_id
    ) -> DialServiceResult<Vec<Uuid>> {
        debug!("Starting batch message ingestion");

        // 1. Validate and transform command (domain pure function)
        let messages = command
            .into_messages(&*self.id_gen, &*self.clock)
            .map_err(DialDomainError::Validation)?;

        // 2. Acquire idempotency guard – this starts a transaction
        //    and acquires the advisory lock.
        let mut guard = self
            .idempotency_guard
            .begin(idempotency_key)
            .await
            .map_err(DialServiceError::Idempotency)?;

        // 3. Use the guard's transaction to persist the messages
        let txn = guard.transaction_mut();
        let result = self
            .message_repo
            .batch_insert(&tenant_id, &messages, txn)
            .await
            .map_err(|e| DialServiceError::Repository(Box::new(e)))?;

        // 4. If all succeeded, commit the idempotency guard (commits the txn)
        //    and cache the result.
        let ids = result.successes; // Vec<Uuid>
        info!(count = ids.len(), "Successfully persisted messages");
        metrics::counter!("dial_messages_batch_size", ids.len() as u64);

        guard
            .complete(ids.clone())
            .await
            .map_err(DialServiceError::Idempotency)?;

        Ok(ids)
    }

    // -------------------------------------------------------------------------
    // Presence
    // -------------------------------------------------------------------------

    /// Marks a user as online.
    #[instrument(skip(self), fields(tenant_id = %tenant_id, user_id = %user_id))]
    pub async fn connect(
        &self,
        tenant_id: TenantId,
        user_id: UserId,
        _idempotency_key: Uuid, // presence does not require idempotency, but we keep the signature
    ) -> DialServiceResult<()> {
        debug!("User connecting");
        self.presence_store
            .set_online(&tenant_id, &user_id)
            .await
            .map_err(|e| DialServiceError::Presence(e.to_string()))?;
        info!("User connected");
        Ok(())
    }

    /// Marks a user as offline.
    #[instrument(skip(self), fields(tenant_id = %tenant_id, user_id = %user_id))]
    pub async fn disconnect(
        &self,
        tenant_id: TenantId,
        user_id: UserId,
        _idempotency_key: Uuid,
    ) -> DialServiceResult<()> {
        debug!("User disconnecting");
        self.presence_store
            .set_offline(&tenant_id, &user_id)
            .await
            .map_err(|e| DialServiceError::Presence(e.to_string()))?;
        info!("User disconnected");
        Ok(())
    }

    /// Checks if a user is currently online.
    #[instrument(skip(self), fields(tenant_id = %tenant_id, user_id = %user_id))]
    pub async fn is_online(
        &self,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DialServiceResult<bool> {
        let online = self
            .presence_store
            .is_online(&tenant_id, &user_id)
            .await
            .map_err(|e| DialServiceError::Presence(e.to_string()))?;
        debug!(online, "Presence check");
        Ok(online)
    }
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_domain_dial::commands::{SendMessageBatchCommand, SendMessageCommand};
    use ataqu_kernel::{MockClock, MockIdGenerator};
    use std::sync::Arc;
    use uuid::Uuid;
use ataqu_kernel::{Clock, IdGenerator};
use ataqu_kernel::TenantId;

    // Dummy implementations for testing (assume we can't modify domain/infra)
    struct DummyIdempotencyGuard;
    #[async_trait]
    impl IdempotencyGuard for DummyIdempotencyGuard {
        async fn begin(&self, _key: Uuid) -> Result<Box<dyn IdempotencyGuard>, IdempotencyError> {
            // In a real impl, this would start a transaction and acquire lock.
            // For mock, just return self.
            Ok(Box::new(Self))
        }

        fn transaction_mut(&mut self) -> &mut DatabaseTransaction {
            // We need a real transaction here; we'll use a dummy one.
            // Since we can't create one, we'll panic in tests that actually call this.
            // For now, we'll just panic to indicate it's not used in our tests.
            unimplemented!("Dummy transaction not used in these tests")
        }

        async fn complete<T>(&mut self, _result: T) -> Result<(), IdempotencyError>
        where
            T: serde::Serialize + Send + Sync,
        {
            Ok(())
        }
    }

    struct DummyMessageRepo;
    #[async_trait]
    impl MessageRepository for DummyMessageRepo {
        async fn batch_insert(
            &self,
            _tenant: &TenantId,
            messages: &[Message],
            _txn: &mut DatabaseTransaction,
        ) -> Result<Vec<Uuid>, Box<dyn std::error::Error + Send + Sync>> {
            // Just return the ids of the messages
            Ok(messages.iter().map(|m| m.id).collect())
        }
    }

    struct DummyPresenceStore;
    #[async_trait]
    impl PresenceStore for DummyPresenceStore {
        async fn set_online(&self, _tenant: &TenantId, _user: &UserId) -> Result<(), String> {
            Ok(())
        }
        async fn set_offline(&self, _tenant: &TenantId, _user: &UserId) -> Result<(), String> {
            Ok(())
        }
        async fn is_online(&self, _tenant: &TenantId, _user: &UserId) -> Result<bool, String> {
            Ok(true)
        }
    }

    #[tokio::test]
    async fn test_send_messages_ok() {
        let id_gen = Arc::new(MockIdGenerator::new());
        let clock = Arc::new(MockClock::new());
        let guard = Arc::new(DummyIdempotencyGuard {});
        let repo = Arc::new(DummyMessageRepo);
        let presence = Arc::new(DummyPresenceStore);

        let service = DialService::new(guard, repo, presence, id_gen.clone(), clock.clone());

        let tenant = TenantId::new(Uuid::new_v4());
        let cmd = SendMessageBatchCommand {
            messages: vec![
                SendMessageCommand {
                    channel_id: Uuid::new_v4(),
                    sender_id: Uuid::new_v4(),
                    content: "hello".to_string(),
                },
                SendMessageCommand {
                    channel_id: Uuid::new_v4(),
                    sender_id: Uuid::new_v4(),
                    content: "world".to_string(),
                },
            ],
        };
        let id_key = Uuid::new_v4();
        let result = service.send_messages(tenant, cmd, id_key).await;
        assert!(result.is_ok());
        let ids = result.unwrap();
        assert_eq!(ids.len(), 2);
    }

    #[tokio::test]
    async fn test_presence_connect_disconnect() {
        let guard = Arc::new(DummyIdempotencyGuard {});
        let repo = Arc::new(DummyMessageRepo);
        let presence = Arc::new(DummyPresenceStore);
        let id_gen = Arc::new(MockIdGenerator::new());
        let clock = Arc::new(MockClock::new());

        let service = DialService::new(guard, repo, presence, id_gen, clock);
        let tenant = TenantId::new(Uuid::new_v4());
        let user = UserId::new(Uuid::new_v4());
        let key = Uuid::new_v4();

        let res = service.connect(tenant.clone(), user.clone(), key).await;
        assert!(res.is_ok());

        let res = service.is_online(tenant.clone(), user.clone()).await;
        assert!(res.is_ok());
        assert!(res.unwrap());

        let res = service.disconnect(tenant, user, key).await;
        assert!(res.is_ok());
    }

    // Additional test: error propagation from repository
    #[tokio::test]
    async fn test_send_messages_repo_error() {
        // This test requires a custom repo that returns an error.
        // We'll create a local struct that implements MessageRepository.
        struct ErrorRepo;
        #[async_trait]
        impl MessageRepository for ErrorRepo {
            async fn batch_insert(
                &self,
                _tenant: &TenantId,
                _messages: &[Message],
                _txn: &mut DatabaseTransaction,
            ) -> Result<Vec<Uuid>, Box<dyn std::error::Error + Send + Sync>> {
                Err("simulated repo error".into())
            }
        }

        let id_gen = Arc::new(MockIdGenerator::new());
        let clock = Arc::new(MockClock::new());
        let guard = Arc::new(DummyIdempotencyGuard {});
        let repo = Arc::new(ErrorRepo);
        let presence = Arc::new(DummyPresenceStore);

        let service = DialService::new(guard, repo, presence, id_gen, clock);
        let tenant = TenantId::new(Uuid::new_v4());
        let cmd = SendMessageBatchCommand {
            messages: vec![SendMessageCommand {
                channel_id: Uuid::new_v4(),
                sender_id: Uuid::new_v4(),
                content: "test".to_string(),
            }],
        };
        let key = Uuid::new_v4();
        let result = service.send_messages(tenant, cmd, key).await;
        assert!(result.is_err());
        match result {
            Err(DialServiceError::Repository(_)) => (),
            _ => panic!("Expected Repository error"),
        }
    }


    // Test validation error: empty content
    #[tokio::test]
    async fn test_send_messages_validation_error() {
        let id_gen = Arc::new(MockIdGenerator::new());
        let clock = Arc::new(MockClock::new());
        let guard = Arc::new(DummyIdempotencyGuard {});
        let repo = Arc::new(DummyMessageRepo);
        let presence = Arc::new(DummyPresenceStore);

        let service = DialService::new(guard, repo, presence, id_gen, clock);
        let tenant = TenantId::new(Uuid::new_v4());
        let cmd = SendMessageBatchCommand {
            messages: vec![SendMessageCommand {
                channel_id: Uuid::new_v4(),
                sender_id: Uuid::new_v4(),
                content: "".to_string(), // empty content
            }],
        };
        let key = Uuid::new_v4();
        let result = service.send_messages(tenant, cmd, key).await;
        assert!(result.is_err());
        match result {
            Err(DialServiceError::Domain(DialDomainError::Validation(_))) => (),
            _ => panic!("Expected Validation error"),
        }
    }

}