use async_trait::async_trait;
use ataqu_domain_pivot::block::{BlockCreatedEvent, BlockType, RelationCreatedEvent};
use ataqu_domain_pivot::database::DatabaseCreatedEvent;
use ataqu_domain_pivot::document::{DocumentCreatedEvent, DocumentVersion};
use ataqu_domain_pivot::repository::{
    BlockRepository, DatabaseRepository, DocumentRepository, RelationRepository,
};
use ataqu_kernel::{RepositoryError, TenantId};
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use uuid::Uuid;

pub struct PivotDocumentRepository {
    db: DatabaseConnection,
}

impl PivotDocumentRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

pub struct PivotDatabaseRepository {
    db: DatabaseConnection,
}

impl PivotDatabaseRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
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

pub struct PivotRelationRepository {
    db: DatabaseConnection,
}

impl PivotRelationRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl DocumentRepository for PivotDocumentRepository {
    async fn save_document(&self, event: &DocumentCreatedEvent) -> Result<(), RepositoryError> {
        let created_at: chrono::DateTime<chrono::Utc> = event.created_at.into();
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO collab_ops.documents (id, tenant_id, title, content, created_at)
               VALUES ($1, $2, $3, $4, $5)"#,
            vec![
                event.id.into(),
                event.tenant_id.as_uuid().into(),
                event.title.clone().into(),
                event.content.clone().into(),
                created_at.into(),
            ],
        );
        self.db
            .execute_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn get_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<DocumentCreatedEvent, RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"SELECT id, tenant_id, title, content, created_at FROM collab_ops.documents
               WHERE tenant_id = $1 AND id = $2"#,
            vec![tenant_id.as_uuid().into(), doc_id.into()],
        );
        let row = self
            .db
            .query_one_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .ok_or(RepositoryError::NotFound)?;

        let created_at: chrono::DateTime<chrono::Utc> = row
            .try_get("", "created_at")
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(DocumentCreatedEvent {
            id: row
                .try_get("", "id")
                .map_err(|e| RepositoryError::Database(e.to_string()))?,
            tenant_id: TenantId::new(
                row.try_get("", "tenant_id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
            ),
            title: row
                .try_get("", "title")
                .map_err(|e| RepositoryError::Database(e.to_string()))?,
            content: row
                .try_get("", "content")
                .map_err(|e| RepositoryError::Database(e.to_string()))?,
            created_at: created_at.into(),
            updated_at: std::time::SystemTime::now(),
        })
    }

    async fn list_documents(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<DocumentCreatedEvent>, RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"SELECT id, tenant_id, title, content, created_at FROM collab_ops.documents
               WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#,
            vec![
                tenant_id.as_uuid().into(),
                (limit as i64).into(),
                (offset as i64).into(),
            ],
        );
        let rows = self
            .db
            .query_all_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        let mut docs = Vec::new();
        for row in rows {
            let created_at: chrono::DateTime<chrono::Utc> = row
                .try_get("", "created_at")
                .map_err(|e| RepositoryError::Database(e.to_string()))?;
            docs.push(DocumentCreatedEvent {
                id: row
                    .try_get("", "id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                tenant_id: TenantId::new(
                    row.try_get("", "tenant_id")
                        .map_err(|e| RepositoryError::Database(e.to_string()))?,
                ),
                title: row
                    .try_get("", "title")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                content: row
                    .try_get("", "content")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                created_at: created_at.into(),
                updated_at: std::time::SystemTime::now(),
            });
        }
        Ok(docs)
    }

    async fn delete_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<(), RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "DELETE FROM collab_ops.documents WHERE tenant_id = $1 AND id = $2",
            vec![tenant_id.as_uuid().into(), doc_id.into()],
        );
        self.db
            .execute_raw(stmt)
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
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"SELECT id, tenant_id, title, content, created_at FROM collab_ops.documents
               WHERE tenant_id = $1 AND (title ILIKE $2 OR content ILIKE $2) ORDER BY created_at DESC LIMIT $3 OFFSET $4"#,
            vec![
                tenant_id.as_uuid().into(),
                format!("%{}%", query).into(),
                (limit as i64).into(),
                (offset as i64).into(),
            ],
        );
        let rows = self
            .db
            .query_all_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        let mut docs = Vec::new();
        for row in rows {
            let created_at: chrono::DateTime<chrono::Utc> = row
                .try_get("", "created_at")
                .map_err(|e| RepositoryError::Database(e.to_string()))?;
            docs.push(DocumentCreatedEvent {
                id: row
                    .try_get("", "id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                tenant_id: TenantId::new(
                    row.try_get("", "tenant_id")
                        .map_err(|e| RepositoryError::Database(e.to_string()))?,
                ),
                title: row
                    .try_get("", "title")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                content: row
                    .try_get("", "content")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                created_at: created_at.into(),
                updated_at: std::time::SystemTime::now(),
            });
        }
        Ok(docs)
    }

    async fn save_document_version(
        &self,
        version: &DocumentVersion,
    ) -> Result<(), RepositoryError> {
        let created_at: chrono::DateTime<chrono::Utc> = version.created_at.into();
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO collab_ops.document_versions (id, tenant_id, document_id, title, content, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            vec![
                version.id.into(),
                version.tenant_id.as_uuid().into(),
                version.document_id.into(),
                version.title.clone().into(),
                version.content.clone().into(),
                created_at.into(),
            ],
        );
        self.db
            .execute_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn list_document_versions(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
        limit: u64,
    ) -> Result<Vec<DocumentVersion>, RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"SELECT id, tenant_id, document_id, title, content, created_at FROM collab_ops.document_versions
               WHERE tenant_id = $1 AND document_id = $2 ORDER BY created_at DESC LIMIT $3"#,
            vec![
                tenant_id.as_uuid().into(),
                doc_id.into(),
                (limit as i64).into(),
            ],
        );
        let rows = self
            .db
            .query_all_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        let mut versions = Vec::new();
        for row in rows {
            let created_at: chrono::DateTime<chrono::Utc> = row
                .try_get("", "created_at")
                .map_err(|e| RepositoryError::Database(e.to_string()))?;
            versions.push(DocumentVersion {
                id: row
                    .try_get("", "id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                tenant_id: TenantId::new(
                    row.try_get("", "tenant_id")
                        .map_err(|e| RepositoryError::Database(e.to_string()))?,
                ),
                document_id: row
                    .try_get("", "document_id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                title: row
                    .try_get("", "title")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                content: row
                    .try_get("", "content")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                created_at: created_at.into(),
            });
        }
        Ok(versions)
    }

    async fn list_templates(
        &self,
        tenant_id: &ataqu_kernel::TenantId,
    ) -> Result<Vec<ataqu_domain_pivot::document::Template>, ataqu_kernel::RepositoryError> {
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "SELECT id, tenant_id, name, content, created_at FROM collab_ops.templates WHERE tenant_id = $1",
            vec![tenant_id.as_uuid().into()],
        );
        let rows = self
            .db
            .query_all_raw(stmt)
            .await
            .map_err(|e| ataqu_kernel::RepositoryError::Database(e.to_string()))?;
        let mut tpls = Vec::new();
        for row in rows {
            let created_at: chrono::DateTime<chrono::Utc> = row
                .try_get("", "created_at")
                .map_err(|e| ataqu_kernel::RepositoryError::Database(e.to_string()))?;
            tpls.push(ataqu_domain_pivot::document::Template {
                id: row
                    .try_get("", "id")
                    .map_err(|e| ataqu_kernel::RepositoryError::Database(e.to_string()))?,
                tenant_id: ataqu_kernel::TenantId::new(
                    row.try_get("", "tenant_id")
                        .map_err(|e| ataqu_kernel::RepositoryError::Database(e.to_string()))?,
                ),
                name: row
                    .try_get("", "name")
                    .map_err(|e| ataqu_kernel::RepositoryError::Database(e.to_string()))?,
                content: row
                    .try_get("", "content")
                    .map_err(|e| ataqu_kernel::RepositoryError::Database(e.to_string()))?,
                created_at: created_at.into(),
            });
        }
        Ok(tpls)
    }

    async fn save_template(
        &self,
        template: &ataqu_domain_pivot::document::Template,
    ) -> Result<(), ataqu_kernel::RepositoryError> {
        let created_at: chrono::DateTime<chrono::Utc> = template.created_at.into();
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "INSERT INTO collab_ops.templates (id, tenant_id, name, content, created_at) VALUES ($1, $2, $3, $4, $5)",
            vec![
                template.id.into(),
                template.tenant_id.as_uuid().into(),
                template.name.clone().into(),
                template.content.clone().into(),
                created_at.into(),
            ],
        );
        self.db
            .execute_raw(stmt)
            .await
            .map_err(|e| ataqu_kernel::RepositoryError::Database(e.to_string()))?;
        Ok(())
    }
}

#[async_trait]
impl DatabaseRepository for PivotDatabaseRepository {
    async fn save_database(&self, event: &DatabaseCreatedEvent) -> Result<(), RepositoryError> {
        let created_at: chrono::DateTime<chrono::Utc> = event.created_at.into();
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO collab_ops.databases (id, tenant_id, name, created_at)
               VALUES ($1, $2, $3, $4)"#,
            vec![
                event.id.into(),
                event.tenant_id.as_uuid().into(),
                event.name.clone().into(),
                created_at.into(),
            ],
        );
        self.db
            .execute_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn list_databases(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<DatabaseCreatedEvent>, RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"SELECT id, tenant_id, name, created_at FROM collab_ops.databases
               WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#,
            vec![
                tenant_id.as_uuid().into(),
                (limit as i64).into(),
                (offset as i64).into(),
            ],
        );
        let rows = self
            .db
            .query_all_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        let mut dbs = Vec::new();
        for row in rows {
            let created_at: chrono::DateTime<chrono::Utc> = row
                .try_get("", "created_at")
                .map_err(|e| RepositoryError::Database(e.to_string()))?;
            dbs.push(DatabaseCreatedEvent {
                id: row
                    .try_get("", "id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                tenant_id: TenantId::new(
                    row.try_get("", "tenant_id")
                        .map_err(|e| RepositoryError::Database(e.to_string()))?,
                ),
                name: row
                    .try_get("", "name")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                created_at: created_at.into(),
            });
        }
        Ok(dbs)
    }

    async fn delete_database(
        &self,
        tenant_id: &TenantId,
        db_id: Uuid,
    ) -> Result<(), RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "DELETE FROM collab_ops.databases WHERE tenant_id = $1 AND id = $2",
            vec![tenant_id.as_uuid().into(), db_id.into()],
        );
        self.db
            .execute_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }
}

#[async_trait]
impl BlockRepository for PivotBlockRepository {
    async fn save_block(&self, event: &BlockCreatedEvent) -> Result<(), RepositoryError> {
        let created_at: chrono::DateTime<chrono::Utc> = event.created_at.into();
        let block_type_str = match &event.block_type {
            BlockType::Markdown(_) => "markdown",
            BlockType::Table { .. } => "table",
            BlockType::View { .. } => "view",
            BlockType::Checklist { .. } => "checklist",
        };
        let content = match &event.block_type {
            BlockType::Markdown(text) => serde_json::json!({ "text": text }),
            BlockType::Table { columns, rows } => {
                serde_json::json!({ "columns": columns, "rows": rows })
            }
            BlockType::View { filter } => serde_json::json!({ "filter": filter }),
            BlockType::Checklist { items } => serde_json::json!({ "items": items }),
        };

        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO collab_ops.blocks (id, tenant_id, document_id, block_type, content, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            vec![
                event.id.into(),
                event.tenant_id.as_uuid().into(),
                event.document_id.into(),
                block_type_str.into(),
                content.into(),
                created_at.into(),
            ],
        );
        self.db
            .execute_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn get_blocks_for_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<Vec<BlockCreatedEvent>, RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"SELECT id, tenant_id, document_id, block_type, content, created_at FROM collab_ops.blocks
               WHERE tenant_id = $1 AND document_id = $2 ORDER BY created_at ASC"#,
            vec![tenant_id.as_uuid().into(), doc_id.into()],
        );
        let rows = self
            .db
            .query_all_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        let mut blocks = Vec::new();
        for row in rows {
            let created_at: chrono::DateTime<chrono::Utc> = row
                .try_get("", "created_at")
                .map_err(|e| RepositoryError::Database(e.to_string()))?;
            let block_type_str: String = row
                .try_get("", "block_type")
                .map_err(|e| RepositoryError::Database(e.to_string()))?;
            let content: serde_json::Value = row
                .try_get("", "content")
                .map_err(|e| RepositoryError::Database(e.to_string()))?;

            let block_type = match block_type_str.as_str() {
                "markdown" => BlockType::Markdown(
                    content
                        .get("text")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                ),
                "table" => BlockType::Table {
                    columns: content
                        .get("columns")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(String::from))
                                .collect()
                        })
                        .unwrap_or_default(),
                    rows: content
                        .get("rows")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|row| {
                                    row.as_array().map(|r| {
                                        r.iter()
                                            .filter_map(|v| v.as_str().map(String::from))
                                            .collect()
                                    })
                                })
                                .collect()
                        })
                        .unwrap_or_default(),
                },
                "view" => BlockType::View {
                    filter: content
                        .get("filter")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                },
                _ => continue,
            };

            blocks.push(BlockCreatedEvent {
                id: row
                    .try_get("", "id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                tenant_id: TenantId::new(
                    row.try_get("", "tenant_id")
                        .map_err(|e| RepositoryError::Database(e.to_string()))?,
                ),
                document_id: row
                    .try_get("", "document_id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                block_type,
                created_at: created_at.into(),
                updated_at: std::time::SystemTime::now(),
            });
        }
        Ok(blocks)
    }

    async fn delete_block(
        &self,
        tenant_id: &TenantId,
        block_id: Uuid,
    ) -> Result<(), RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "DELETE FROM collab_ops.blocks WHERE tenant_id = $1 AND id = $2",
            vec![tenant_id.as_uuid().into(), block_id.into()],
        );
        self.db
            .execute_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn get_block_by_id(
        &self,
        tenant_id: &TenantId,
        block_id: Uuid,
    ) -> Result<BlockCreatedEvent, RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"SELECT id, tenant_id, document_id, block_type, content, created_at FROM collab_ops.blocks
               WHERE tenant_id = $1 AND id = $2"#,
            vec![tenant_id.as_uuid().into(), block_id.into()],
        );
        let row = self
            .db
            .query_one_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .ok_or(RepositoryError::NotFound)?;

        let created_at: chrono::DateTime<chrono::Utc> = row
            .try_get("", "created_at")
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        let block_type_str: String = row
            .try_get("", "block_type")
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        let content: serde_json::Value = row
            .try_get("", "content")
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        let block_type = match block_type_str.as_str() {
            "markdown" => BlockType::Markdown(
                content
                    .get("text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
            ),
            "table" => BlockType::Table {
                columns: content
                    .get("columns")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default(),
                rows: content
                    .get("rows")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|row| {
                                row.as_array().map(|r| {
                                    r.iter()
                                        .filter_map(|v| v.as_str().map(String::from))
                                        .collect()
                                })
                            })
                            .collect()
                    })
                    .unwrap_or_default(),
            },
            "view" => BlockType::View {
                filter: content
                    .get("filter")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
            },
            _ => {
                return Err(RepositoryError::Database(
                    "Invalid block_type in DB".to_string(),
                ));
            }
        };

        Ok(BlockCreatedEvent {
            id: row
                .try_get("", "id")
                .map_err(|e| RepositoryError::Database(e.to_string()))?,
            tenant_id: TenantId::new(
                row.try_get("", "tenant_id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
            ),
            document_id: row
                .try_get("", "document_id")
                .map_err(|e| RepositoryError::Database(e.to_string()))?,
            block_type,
            created_at: created_at.into(),
            updated_at: std::time::SystemTime::now(),
        })
    }
}

#[async_trait]
impl RelationRepository for PivotRelationRepository {
    async fn save_relation(&self, event: &RelationCreatedEvent) -> Result<(), RepositoryError> {
        let created_at: chrono::DateTime<chrono::Utc> = event.created_at.into();
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"INSERT INTO collab_ops.relations (id, tenant_id, from_block_id, to_block_id, relation_type, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            vec![
                event.id.into(),
                event.tenant_id.as_uuid().into(),
                event.relation.from_block_id.into(),
                event.relation.to_block_id.into(),
                event.relation.relation_type.clone().into(),
                created_at.into(),
            ],
        );
        self.db
            .execute_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn get_relations_for_document(
        &self,
        tenant_id: &TenantId,
        doc_id: Uuid,
    ) -> Result<Vec<RelationCreatedEvent>, RepositoryError> {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"SELECT r.id, r.tenant_id, r.from_block_id, r.to_block_id, r.relation_type, r.created_at
               FROM collab_ops.relations r
               JOIN collab_ops.blocks b ON r.from_block_id = b.id
               WHERE r.tenant_id = $1 AND b.document_id = $2"#,
            vec![tenant_id.as_uuid().into(), doc_id.into()],
        );
        let rows = self
            .db
            .query_all_raw(stmt)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        let mut rels = Vec::new();
        for row in rows {
            let created_at: chrono::DateTime<chrono::Utc> = row
                .try_get("", "created_at")
                .map_err(|e| RepositoryError::Database(e.to_string()))?;
            rels.push(RelationCreatedEvent {
                id: row
                    .try_get("", "id")
                    .map_err(|e| RepositoryError::Database(e.to_string()))?,
                tenant_id: TenantId::new(
                    row.try_get("", "tenant_id")
                        .map_err(|e| RepositoryError::Database(e.to_string()))?,
                ),
                relation: ataqu_domain_pivot::block::Relation {
                    from_block_id: row
                        .try_get("", "from_block_id")
                        .map_err(|e| RepositoryError::Database(e.to_string()))?,
                    to_block_id: row
                        .try_get("", "to_block_id")
                        .map_err(|e| RepositoryError::Database(e.to_string()))?,
                    relation_type: row
                        .try_get("", "relation_type")
                        .map_err(|e| RepositoryError::Database(e.to_string()))?,
                },
                created_at: created_at.into(),
            });
        }
        Ok(rels)
    }
}
