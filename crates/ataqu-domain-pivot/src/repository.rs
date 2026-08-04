use crate::block::{BlockCreatedEvent, RelationCreatedEvent};
use crate::database::DatabaseCreatedEvent;
use crate::document::DocumentCreatedEvent;
use async_trait::async_trait;
use ataqu_kernel::{RepositoryError, TenantId};
use uuid::Uuid;

#[async_trait]
pub trait DocumentRepository: Send + Sync {
    async fn save_document(&self, event: &DocumentCreatedEvent) -> Result<(), RepositoryError>;
    async fn get_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<DocumentCreatedEvent, RepositoryError>;
    async fn list_documents(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<DocumentCreatedEvent>, RepositoryError>;
    async fn delete_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<(), RepositoryError>;
    async fn search_documents(
        &self,
        tenant_id: &TenantId,
        query: &str,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<DocumentCreatedEvent>, RepositoryError>;
}

#[async_trait]
pub trait DatabaseRepository: Send + Sync {
    async fn save_database(&self, event: &DatabaseCreatedEvent) -> Result<(), RepositoryError>;
    async fn list_databases(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<DatabaseCreatedEvent>, RepositoryError>;
    async fn delete_database(
        &self,
        tenant_id: &TenantId,
        db_id: Uuid,
    ) -> Result<(), RepositoryError>;
}

#[async_trait]
pub trait BlockRepository: Send + Sync {
    async fn save_block(&self, event: &BlockCreatedEvent) -> Result<(), RepositoryError>;
    async fn get_blocks_for_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<Vec<BlockCreatedEvent>, RepositoryError>;
}

#[async_trait]
pub trait RelationRepository: Send + Sync {
    async fn save_relation(&self, event: &RelationCreatedEvent) -> Result<(), RepositoryError>;
    async fn get_relations_for_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<Vec<RelationCreatedEvent>, RepositoryError>;
}
