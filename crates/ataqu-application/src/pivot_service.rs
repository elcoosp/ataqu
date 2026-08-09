//! PIVOT application service – orchestrates docs, blocks, relations using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use crate::outbox::Outbox;
use ataqu_domain_pivot::block::{self as block_domain, BlockType};
use ataqu_domain_pivot::database::{
    self as database_domain, CreateDatabaseCommand as DomainCreateDatabase,
};
use ataqu_domain_pivot::document::{
    self as document_domain, CreateDocumentCommand as DomainCreateDocument,
};
use ataqu_domain_pivot::repository::{
    BlockRepository, DatabaseRepository, DocumentRepository, RelationRepository,
};
use ataqu_kernel::{Clock, IdGenerator, RepositoryError, TenantId};

// Re-export domain types for API layer
pub use ataqu_domain_pivot::block::Block;
pub use ataqu_domain_pivot::block::Relation;
pub use ataqu_domain_pivot::database::DatabaseCreatedEvent as Database;
pub use ataqu_domain_pivot::document::DocumentCreatedEvent as Document;

// Application commands
#[derive(Debug, Clone)]
pub struct CreateDatabaseCommand {
    pub tenant_id: TenantId,
    pub name: String,
}

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
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type PivotResult<T> = Result<T, PivotServiceError>;

pub struct PivotService {
    doc_repo: Arc<dyn DocumentRepository + Send + Sync>,
    db_repo: Arc<dyn DatabaseRepository + Send + Sync>,
    block_repo: Arc<dyn BlockRepository + Send + Sync>,
    rel_repo: Arc<dyn RelationRepository + Send + Sync>,
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
    audit_repo: Option<Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>>,
}

impl PivotService {
    pub fn new(
        doc_repo: Arc<dyn DocumentRepository + Send + Sync>,
        db_repo: Arc<dyn DatabaseRepository + Send + Sync>,
        block_repo: Arc<dyn BlockRepository + Send + Sync>,
        rel_repo: Arc<dyn RelationRepository + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
        audit_repo: Option<Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>>,
    ) -> Self {
        Self {
            doc_repo,
            db_repo,
            block_repo,
            rel_repo,
            outbox,
            id_gen,
            clock,
            audit_repo,
        }
    }

    // -- Databases --
    pub async fn create_database(&self, cmd: CreateDatabaseCommand) -> PivotResult<Database> {
        let domain_cmd = DomainCreateDatabase {
            tenant_id: cmd.tenant_id,
            name: cmd.name,
        };
        let event =
            database_domain::create_database(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
        self.db_repo
            .save_database(&event)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;

        let payload = serde_json::json!({
            "database_id": event.id,
            "tenant_id": event.tenant_id.as_uuid(),
            "name": event.name,
        });
        self.outbox
            .append("collab_ops", "DatabaseCreated", event.id, &payload)
            .await
            .map_err(PivotServiceError::Repository)?;

        Ok(event)
    }

    pub async fn list_databases(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> PivotResult<Vec<Database>> {
        self.db_repo
            .list_databases(&tenant_id, limit, offset)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))
    }

    pub async fn delete_database(&self, tenant_id: TenantId, db_id: Uuid) -> PivotResult<()> {
        self.db_repo
            .delete_database(&tenant_id, db_id)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))
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

        let payload = serde_json::json!({
            "document_id": event.id,
            "tenant_id": event.tenant_id.as_uuid(),
            "title": event.title,
        });
        self.outbox
            .append("collab_ops", "DocumentCreated", event.id, &payload)
            .await
            .map_err(PivotServiceError::Repository)?;

        if let Some(audit_repo) = &self.audit_repo {
            audit_repo.append_log(
                event.tenant_id,
                Uuid::nil(),
                "create_document",
                "pivot",
                Some("document"),
                Some(event.id),
                None,
                Some(serde_json::json!({"title": event.title})),
                None,
                None,
            ).await.ok();
        }

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
        expected_version: i32,
    ) -> PivotResult<Document> {
        let mut doc = self.get_document(tenant_id, doc_id).await?;

        if doc.version != expected_version {
            return Err(PivotServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, doc.version
            )));
        }

        if let Some(t) = title {
            doc.title = t;
        }
        if let Some(c) = content {
            doc.content = c;
        }
        doc.version += 1;

        self.doc_repo
            .save_document(&doc)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;

        let version = ataqu_domain_pivot::document::DocumentVersion {
            id: self.id_gen.new_uuid_v7(),
            tenant_id: doc.tenant_id,
            document_id: doc.id,
            title: doc.title.clone(),
            content: doc.content.clone(),
            created_at: self.clock.now(),
        };
        self.doc_repo
            .save_document_version(&version)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;

        Ok(doc)
    }

    pub async fn delete_document(&self, tenant_id: TenantId, doc_id: Uuid) -> PivotResult<()> {
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
        self.get_document(cmd.tenant_id, cmd.document_id).await?;
        let domain_cmd = block_domain::CreateBlockCommand {
            tenant_id: cmd.tenant_id,
            document_id: cmd.document_id,
            block_type: cmd.block_type,
        };
        let event =
            block_domain::create_block(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
        let block = Block {
            id: event.id,
            tenant_id: event.tenant_id,
            document_id: event.document_id,
            block_type: event.block_type,
            created_at: event.created_at,
            updated_at: event.created_at,
            version: 0,
        };
        self.block_repo
            .save_block(&block)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;

        let payload = serde_json::json!({
            "block_id": block.id,
            "tenant_id": block.tenant_id.as_uuid(),
            "document_id": block.document_id,
        });
        self.outbox
            .append("collab_ops", "BlockCreated", block.id, &payload)
            .await
            .map_err(PivotServiceError::Repository)?;

        Ok(block)
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

    pub async fn update_block(
        &self,
        tenant_id: TenantId,
        block_id: Uuid,
        block_type: BlockType,
        expected_version: i32,
    ) -> PivotResult<Block> {
        let block_event = self
            .block_repo
            .get_block_by_id(&tenant_id, block_id)
            .await
            .map_err(|e| match e {
                ataqu_kernel::RepositoryError::NotFound => PivotServiceError::BlockNotFound,
                _ => PivotServiceError::Repository(e.to_string()),
            })?;

        // ADR-005: Optimistic Concurrency Control
        if block_event.version != expected_version {
            return Err(PivotServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, block_event.version
            )));
        }

        let updated_block = Block {
            id: block_event.id,
            tenant_id: block_event.tenant_id,
            document_id: block_event.document_id,
            block_type,
            created_at: block_event.created_at,
            updated_at: self.clock.now(),
            version: block_event.version + 1,
        };
        self.block_repo
            .save_block(&updated_block)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;
        Ok(updated_block)
    }

    pub async fn delete_block(&self, tenant_id: TenantId, block_id: Uuid) -> PivotResult<()> {
        self.block_repo
            .delete_block(&tenant_id, block_id)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))
    }

    // -- Relations --
    pub async fn create_relation(&self, cmd: CreateRelationCommand) -> PivotResult<Relation> {
        self.block_repo
            .get_block_by_id(&cmd.tenant_id, cmd.from_block_id)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;
        self.block_repo
            .get_block_by_id(&cmd.tenant_id, cmd.to_block_id)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;
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

        let payload = serde_json::json!({
            "from_block_id": relation.from_block_id,
            "to_block_id": relation.to_block_id,
            "relation_type": relation.relation_type,
        });
        self.outbox
            .append("collab_ops", "RelationCreated", relation.from_block_id, &payload)
            .await
            .map_err(PivotServiceError::Repository)?;

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

    pub async fn list_document_versions(
        &self,
        tenant_id: TenantId,
        doc_id: Uuid,
        limit: u64,
    ) -> PivotResult<Vec<ataqu_domain_pivot::document::DocumentVersion>> {
        self.doc_repo
            .list_document_versions(&tenant_id, doc_id, limit)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))
    }

    pub async fn create_template(
        &self,
        tenant_id: TenantId,
        name: String,
        content: String,
    ) -> PivotResult<ataqu_domain_pivot::document::Template> {
        let template = ataqu_domain_pivot::document::Template {
            id: self.id_gen.new_uuid_v7(),
            tenant_id,
            name,
            content,
            created_at: self.clock.now(),
        };
        self.doc_repo
            .save_template(&template)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;

        let payload = serde_json::json!({
            "template_id": template.id,
            "tenant_id": template.tenant_id.as_uuid(),
            "name": template.name,
        });
        self.outbox
            .append("collab_ops", "TemplateCreated", template.id, &payload)
            .await
            .map_err(PivotServiceError::Repository)?;

        Ok(template)
    }

    pub async fn list_templates(
        &self,
        tenant_id: TenantId,
    ) -> PivotResult<Vec<ataqu_domain_pivot::document::Template>> {
        self.doc_repo
            .list_templates(&tenant_id)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))
    }

    pub async fn apply_template(
        &self,
        tenant_id: TenantId,
        template_id: Uuid,
    ) -> PivotResult<Document> {
        let templates = self
            .doc_repo
            .list_templates(&tenant_id)
            .await
            .map_err(|e| PivotServiceError::Repository(e.to_string()))?;
        let template = templates
            .iter()
            .find(|t| t.id == template_id)
            .ok_or_else(|| PivotServiceError::Validation("Template not found".to_string()))?;

        let cmd = CreateDocumentCommand {
            tenant_id,
            title: template.name.clone(),
            content: template.content.clone(),
        };
        self.create_document(cmd).await
    }
}
