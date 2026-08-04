use async_trait::async_trait;
use ataqu_domain_pivot::block::{BlockCreatedEvent, BlockType, RelationCreatedEvent, Relation};
use ataqu_domain_pivot::document::DocumentCreatedEvent;
use ataqu_domain_pivot::repository::{BlockRepository, DocumentRepository, RelationRepository};
use ataqu_kernel::{RepositoryError, TenantId};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, Set};
use uuid::Uuid;

use crate::entities::pivot::block as block_entity;
use crate::entities::pivot::document as document_entity;
use crate::entities::pivot::relation as relation_entity;

pub struct PivotDocumentRepository {
    db: DatabaseConnection,
}

impl PivotDocumentRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn doc_model_to_event(model: document_entity::Model) -> DocumentCreatedEvent {
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
        let active = document_entity::ActiveModel {
            id: Set(event.id),
            tenant_id: Set(event.tenant_id.as_uuid()),
            title: Set(event.title.clone()),
            content: Set(Some(event.content.clone())),
            metadata: Set(None),
            created_at: Set(event.created_at.into()),
            updated_at: Set(event.created_at.into()),
        };
        let exists = document_entity::Entity::find_by_id(event.id)
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .is_some();
        if exists {
            document_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| RepositoryError::Database(e.to_string()))?;
        } else {
            document_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| RepositoryError::Database(e.to_string()))?;
        }
        Ok(())
    }

    async fn get_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<DocumentCreatedEvent, RepositoryError> {
        let model = document_entity::Entity::find()
            .filter(document_entity::Column::Id.eq(doc_id))
            .filter(document_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .ok_or(RepositoryError::NotFound)?;
        Ok(doc_model_to_event(model))
    }

    async fn list_documents(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<DocumentCreatedEvent>, RepositoryError> {
        let models = document_entity::Entity::find()
            .filter(document_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(models.into_iter().map(doc_model_to_event).collect())
    }

    async fn delete_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<(), RepositoryError> {
        document_entity::Entity::delete_many()
            .filter(document_entity::Column::Id.eq(doc_id))
            .filter(document_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn search_documents(
        &self,
        tenant_id: &TenantId,
        query: &str,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<DocumentCreatedEvent>, RepositoryError> {
        let sql = r#"
            SELECT * FROM collab_ops.documents
            WHERE tenant_id = $1
            AND search_vector @@ to_tsquery('english', $2)
            LIMIT $3 OFFSET $4
        "#;
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            sql,
            vec![
                tenant_id.as_uuid().into(),
                query.into(),
                (limit as i64).into(),
                (offset as i64).into(),
            ],
        );

        let models = document_entity::Entity::find()
            .from_raw_sql(stmt)
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(models.into_iter().map(doc_model_to_event).collect())
    }
}

pub struct PivotBlockRepository {
    db: DatabaseConnection,
}

impl PivotBlockRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn block_model_to_event(model: block_entity::Model) -> BlockCreatedEvent {
    let block_type = match model.block_type.as_str() {
        "markdown" => BlockType::Markdown(
            model
                .content
                .get("text")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        ),
        "table" => BlockType::Table {
            columns: model
                .content
                .get("columns")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default(),
            rows: model
                .content
                .get("rows")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|row| {
                            row.as_array().map(|r| {
                                r.iter()
                                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                    .collect()
                            })
                        })
                        .collect()
                })
                .unwrap_or_default(),
        },
        "view" => BlockType::View {
            filter: model
                .content
                .get("filter")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        },
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
        let (block_type_str, content_json) = match &event.block_type {
            BlockType::Markdown(text) => ("markdown", serde_json::json!({ "text": text })),
            BlockType::Table { columns, rows } => {
                ("table", serde_json::json!({ "columns": columns, "rows": rows }))
            }
            BlockType::View { filter } => ("view", serde_json::json!({ "filter": filter })),
        };

        let active = block_entity::ActiveModel {
            id: Set(event.id),
            tenant_id: Set(event.tenant_id.as_uuid()),
            document_id: Set(event.document_id),
            block_type: Set(block_type_str.to_string()),
            content: Set(content_json),
            created_at: Set(event.created_at.into()),
            updated_at: Set(event.created_at.into()),
        };
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

pub struct PivotRelationRepository {
    db: DatabaseConnection,
}

impl PivotRelationRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl RelationRepository for PivotRelationRepository {
    async fn save_relation(&self, event: &RelationCreatedEvent) -> Result<(), RepositoryError> {
        let active = relation_entity::ActiveModel {
            id: Set(event.id),
            tenant_id: Set(event.tenant_id.as_uuid()),
            from_block_id: Set(event.relation.from_block_id),
            to_block_id: Set(event.relation.to_block_id),
            relation_type: Set(event.relation.relation_type.clone()),
            created_at: Set(event.created_at.into()),
        };
        relation_entity::Entity::insert(active)
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
        let block_ids: Vec<Uuid> = block_entity::Entity::find()
            .filter(block_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(block_entity::Column::DocumentId.eq(doc_id))
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .into_iter()
            .map(|m| m.id)
            .collect();

        let models = relation_entity::Entity::find()
            .filter(relation_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(relation_entity::Column::FromBlockId.is_in(block_ids))
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(models
            .into_iter()
            .map(|m| RelationCreatedEvent {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                relation: Relation {
                    from_block_id: m.from_block_id,
                    to_block_id: m.to_block_id,
                    relation_type: m.relation_type,
                },
                created_at: m.created_at.into(),
            })
            .collect())
    }
}
