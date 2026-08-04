//! SeaORM implementations for PIVOT domain repositories.
use async_trait::async_trait;
use sea_orm::{
    ColumnTrait, Condition, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, Set,
};
use uuid::Uuid;

use ataqu_domain_pivot::block::{BlockCreatedEvent, BlockType, Relation, RelationCreatedEvent};
use ataqu_domain_pivot::document::DocumentCreatedEvent;
use ataqu_domain_pivot::repository::{BlockRepository, DocumentRepository, RelationRepository};
use ataqu_kernel::{RepositoryError, TenantId};

use crate::entities::pivot::block as block_entity;
use crate::entities::pivot::document as doc_entity;
use crate::entities::pivot::relation as rel_entity;

// ---------- Document Repository ----------
pub struct PivotDocumentRepository {
    db: DatabaseConnection,
}
impl PivotDocumentRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn document_event_to_active(event: &DocumentCreatedEvent) -> doc_entity::ActiveModel {
    doc_entity::ActiveModel {
        id: Set(event.id),
        tenant_id: Set(event.tenant_id.as_uuid()),
        title: Set(event.title.clone()),
        content: Set(Some(event.content.clone())),
        metadata: Set(None),
        created_at: Set(event.created_at.into()),
        updated_at: Set(event.created_at.into()),
    }
}

fn document_model_to_event(model: doc_entity::Model) -> DocumentCreatedEvent {
    DocumentCreatedEvent {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        title: model.title,
        content: model.content.unwrap_or_default(),
        created_at: model.created_at.into(),
    }
}

#[async_trait]
impl DocumentRepository for PivotDocumentRepository {
    async fn save_document(&self, event: &DocumentCreatedEvent) -> Result<(), RepositoryError> {
        let active = document_event_to_active(event);
        doc_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn get_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<DocumentCreatedEvent, RepositoryError> {
        let model = doc_entity::Entity::find()
            .filter(doc_entity::Column::Id.eq(doc_id))
            .filter(doc_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .ok_or(RepositoryError::NotFound)?;
        Ok(document_model_to_event(model))
    }

    async fn list_documents(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<DocumentCreatedEvent>, RepositoryError> {
        let models = doc_entity::Entity::find()
            .filter(doc_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(models.into_iter().map(document_model_to_event).collect())
    }
}

// ---------- Block Repository ----------
pub struct PivotBlockRepository {
    db: DatabaseConnection,
}
impl PivotBlockRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn block_event_to_active(event: &BlockCreatedEvent) -> block_entity::ActiveModel {
    let block_type_str = match &event.block_type {
        BlockType::Markdown(_) => "markdown".to_string(),
        BlockType::Table { .. } => "table".to_string(),
        BlockType::View { .. } => "view".to_string(),
    };
    let content = match &event.block_type {
        BlockType::Markdown(text) => serde_json::json!({ "text": text }),
        BlockType::Table { columns, rows } => {
            serde_json::json!({ "columns": columns, "rows": rows })
        }
        BlockType::View { filter } => serde_json::json!({ "filter": filter }),
    };
    block_entity::ActiveModel {
        id: Set(event.id),
        tenant_id: Set(event.tenant_id.as_uuid()),
        document_id: Set(event.document_id),
        block_type: Set(block_type_str),
        content: Set(content),
        created_at: Set(event.created_at.into()),
        updated_at: Set(event.created_at.into()),
    }
}

fn block_model_to_event(model: block_entity::Model) -> BlockCreatedEvent {
    let block_type = match model.block_type.as_str() {
        "markdown" => {
            let text = model
                .content
                .get("text")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            BlockType::Markdown(text)
        }
        "table" => {
            let columns = model
                .content
                .get("columns")
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            let rows = model
                .content
                .get("rows")
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|row| {
                            row.as_array().map(|r| {
                                r.iter()
                                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                        })
                        .collect()
                })
                .unwrap_or_default();
            BlockType::Table { columns, rows }
        }
        "view" => {
            let filter = model
                .content
                .get("filter")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            BlockType::View { filter }
        }
        _ => BlockType::Markdown("".to_string()),
    };
    BlockCreatedEvent {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        document_id: model.document_id,
        block_type,
        created_at: model.created_at.into(),
    }
}

#[async_trait]
impl BlockRepository for PivotBlockRepository {
    async fn save_block(&self, event: &BlockCreatedEvent) -> Result<(), RepositoryError> {
        let active = block_event_to_active(event);
        block_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn get_blocks_for_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<Vec<BlockCreatedEvent>, RepositoryError> {
        let models = block_entity::Entity::find()
            .filter(block_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(block_entity::Column::DocumentId.eq(doc_id))
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(models.into_iter().map(block_model_to_event).collect())
    }
}

// ---------- Relation Repository ----------
pub struct PivotRelationRepository {
    db: DatabaseConnection,
}
impl PivotRelationRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn relation_event_to_active(event: &RelationCreatedEvent) -> rel_entity::ActiveModel {
    rel_entity::ActiveModel {
        id: Set(event.id),
        tenant_id: Set(event.tenant_id.as_uuid()),
        from_block_id: Set(event.relation.from_block_id),
        to_block_id: Set(event.relation.to_block_id),
        relation_type: Set(event.relation.relation_type.clone()),
        created_at: Set(event.created_at.into()),
    }
}

fn relation_model_to_event(model: rel_entity::Model) -> RelationCreatedEvent {
    let rel = Relation {
        from_block_id: model.from_block_id,
        to_block_id: model.to_block_id,
        relation_type: model.relation_type,
    };
    RelationCreatedEvent {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        relation: rel,
        created_at: model.created_at.into(),
    }
}

#[async_trait]
impl RelationRepository for PivotRelationRepository {
    async fn save_relation(&self, event: &RelationCreatedEvent) -> Result<(), RepositoryError> {
        let active = relation_event_to_active(event);
        rel_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn get_relations_for_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<Vec<RelationCreatedEvent>, RepositoryError> {
        // Get all blocks of the document
        let block_models = block_entity::Entity::find()
            .filter(block_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(block_entity::Column::DocumentId.eq(doc_id))
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        let block_ids: Vec<Uuid> = block_models.into_iter().map(|b| b.id).collect();
        if block_ids.is_empty() {
            return Ok(Vec::new());
        }
        // Find relations where either from_block_id or to_block_id is in the block_ids
        let condition = Condition::any()
            .add(rel_entity::Column::FromBlockId.is_in(block_ids.clone()))
            .add(rel_entity::Column::ToBlockId.is_in(block_ids));
        let models = rel_entity::Entity::find()
            .filter(rel_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(condition)
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(models.into_iter().map(relation_model_to_event).collect())
    }
}
