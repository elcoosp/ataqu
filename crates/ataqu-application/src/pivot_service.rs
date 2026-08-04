//! PIVOT application service – orchestrates docs, blocks, relations using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use ataqu_domain_pivot::block::{self as block_domain, BlockType};
use ataqu_domain_pivot::document::{
    self as document_domain, CreateDocumentCommand as DomainCreateDocument,
};
use ataqu_domain_pivot::repository::{BlockRepository, DocumentRepository, RelationRepository};
use ataqu_kernel::{Clock, IdGenerator, RepositoryError, TenantId};

// Re-export domain types for API layer
pub use ataqu_domain_pivot::block::BlockCreatedEvent as Block;
pub use ataqu_domain_pivot::block::Relation;
pub use ataqu_domain_pivot::document::DocumentCreatedEvent as Document;

// Application commands
#[derive(Debug, Clone)]
pub struct CreateDocumentCommand {
    pub tenant_id: TenantId,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct CreateBlockCommand {
    pub tenant_id: TenantId,
    pub document_id: Uuid,
    pub block_type: BlockType,
}

#[derive(Debug, Clone)]
pub struct CreateRelationCommand {
    pub tenant_id: TenantId,
    pub from_block_id: Uuid,
    pub to_block_id: Uuid,
    pub relation_type: String,
}

#[derive(Debug, thiserror::Error)]
pub enum PivotServiceError {
    #[error("Document not found")]
    DocumentNotFound,
    #[error("Block not found")]
    BlockNotFound,
    #[error("Repository error: {0}")]
    Repository(String),
    #[error("Domain error: {0}")]
    Domain(String),
}

pub type PivotResult<T> = Result<T, PivotServiceError>;

pub struct PivotService {
    doc_repo: Arc<dyn DocumentRepository + Send + Sync>,
    block_repo: Arc<dyn BlockRepository + Send + Sync>,
    rel_repo: Arc<dyn RelationRepository + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl PivotService {
    pub fn new(
        doc_repo: Arc<dyn DocumentRepository + Send + Sync>,
        block_repo: Arc<dyn BlockRepository + Send + Sync>,
        rel_repo: Arc<dyn RelationRepository + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            doc_repo,
            block_repo,
            rel_repo,
            id_gen,
            clock,
        }
    }

    // -- Documents --
    pub async fn create_document(&self, cmd: CreateDocumentCommand) -> PivotResult<Document> {
        let domain_cmd = DomainCreateDocument {
            tenant_id: cmd.tenant_id,
            title: cmd.title,
            content: cmd.content,
        };
        let event =
            document_domain::create_document(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
        self.doc_repo
            .save_document(&event)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;
        Ok(event)
    }

    pub async fn get_document(&self, tenant_id: TenantId, doc_id: Uuid) -> PivotResult<Document> {
        self.doc_repo
            .get_document(&tenant_id, doc_id)
            .await
            .map_err(|e| match e {
                RepositoryError::NotFound => PivotServiceError::DocumentNotFound,
                _ => PivotServiceError::Repository(e.to_string()),
            })
    }

    pub async fn update_document(
        &self,
        tenant_id: TenantId,
        doc_id: Uuid,
        title: Option<String>,
        content: Option<String>,
    ) -> PivotResult<Document> {
        let mut doc = self.get_document(tenant_id, doc_id).await?;
        if let Some(t) = title {
            doc.title = t;
        }
        if let Some(c) = content {
            doc.content = c;
        }
        self.doc_repo
            .save_document(&doc)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;
        Ok(doc)
    }

    pub async fn delete_document(
        &self,
        tenant_id: TenantId,
        doc_id: Uuid,
    ) -> PivotResult<()> {
        self.doc_repo
            .delete_document(&tenant_id, doc_id)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))
    }

    pub async fn list_documents(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> PivotResult<Vec<Document>> {
        self.doc_repo
            .list_documents(&tenant_id, limit, offset)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))
    }

    // -- Blocks --
    pub async fn create_block(&self, cmd: CreateBlockCommand) -> PivotResult<Block> {
        let domain_cmd = block_domain::CreateBlockCommand {
            tenant_id: cmd.tenant_id,
            document_id: cmd.document_id,
            block_type: cmd.block_type,
        };
        let event =
            block_domain::create_block(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
        self.block_repo
            .save_block(&event)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;
        Ok(event)
    }

    pub async fn get_blocks_for_document(
        &self,
        tenant_id: TenantId,
        doc_id: Uuid,
    ) -> PivotResult<Vec<Block>> {
        self.block_repo
            .get_blocks_for_document(&tenant_id, doc_id)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))
    }

    // -- Relations --
    pub async fn create_relation(&self, cmd: CreateRelationCommand) -> PivotResult<Relation> {
        let rel = Relation {
            from_block_id: cmd.from_block_id,
            to_block_id: cmd.to_block_id,
            relation_type: cmd.relation_type,
        };
        let domain_cmd = block_domain::CreateRelationCommand {
            tenant_id: cmd.tenant_id,
            relation: rel,
        };
        let event =
            block_domain::create_relation(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
        self.rel_repo
            .save_relation(&event)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;
        let relation = Relation {
            from_block_id: event.relation.from_block_id,
            to_block_id: event.relation.to_block_id,
            relation_type: event.relation.relation_type,
        };
        Ok(relation)
    }

    pub async fn get_relations_for_document(
        &self,
        tenant_id: TenantId,
        doc_id: Uuid,
    ) -> PivotResult<Vec<Relation>> {
        let events = self
            .rel_repo
            .get_relations_for_document(&tenant_id, doc_id)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;
        let relations = events
            .into_iter()
            .map(|e| Relation {
                from_block_id: e.relation.from_block_id,
                to_block_id: e.relation.to_block_id,
                relation_type: e.relation.relation_type,
            })
            .collect();
        Ok(relations)
    }

    pub async fn search_documents(
        &self,
        tenant_id: TenantId,
        query: String,
        limit: u64,
        offset: u64,
    ) -> PivotResult<Vec<Document>> {
        self.doc_repo
            .search_documents(&tenant_id, &query, limit, offset)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))
    }
}
