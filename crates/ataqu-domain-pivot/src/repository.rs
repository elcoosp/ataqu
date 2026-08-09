use crate::block::Block;
use crate::database::DatabaseCreatedEvent;
use crate::document::DocumentCreatedEvent;
use ataqu_kernel::{RepositoryError, TenantId};
use uuid::Uuid;

#[async_trait::async_trait]
pub trait BlockRepository: Send + Sync {
    async fn save_block(&self, block: &Block) -> Result<(), RepositoryError>;
    async fn get_block_by_id(
        &self,
        tenant_id: &TenantId,
        block_id: Uuid,
    ) -> Result<Block, RepositoryError>;
    async fn get_blocks_for_document(
        &self,
        tenant_id: &TenantId,
        document_id: Uuid,
    ) -> Result<Vec<Block>, RepositoryError>;
    async fn delete_block(
        &self,
        tenant_id: &TenantId,
        block_id: Uuid,
    ) -> Result<(), RepositoryError>;
}

#[async_trait::async_trait]
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

#[async_trait::async_trait]
pub trait DocumentRepository: Send + Sync {
    async fn save_document(&self, event: &DocumentCreatedEvent) -> Result<(), RepositoryError>;
    async fn get_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<DocumentCreatedEvent, RepositoryError>;
    async fn save_document_version(
        &self,
        version: &crate::document::DocumentVersion,
    ) -> Result<(), RepositoryError>;
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
    async fn list_document_versions(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
        limit: u64,
    ) -> Result<Vec<crate::document::DocumentVersion>, RepositoryError>;
    async fn save_template(
        &self,
        template: &crate::document::Template,
    ) -> Result<(), RepositoryError>;
    async fn list_templates(
        &self,
        tenant_id: &TenantId,
    ) -> Result<Vec<crate::document::Template>, RepositoryError>;
}

#[async_trait::async_trait]
pub trait RelationRepository: Send + Sync {
    async fn save_relation(
        &self,
        event: &crate::block::RelationCreatedEvent,
    ) -> Result<(), RepositoryError>;
    async fn get_relations_for_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<Vec<crate::block::RelationCreatedEvent>, RepositoryError>;
}

// Re-export types for convenience
pub use crate::block::BlockCreatedEvent;
pub use crate::block::Relation;
