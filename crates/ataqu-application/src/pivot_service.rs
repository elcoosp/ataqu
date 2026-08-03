//! PIVOT application service – in-memory document and relation store.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_contracts::pivot::{
    Document, Database, Relation,
    CreateDocumentCommand, UpdateDocumentCommand,
    CreateRelationCommand,
    ListDocumentsParams, ListRelationsParams, SearchParams,
};

#[derive(Debug, thiserror::Error)]
pub enum PivotServiceError {
    #[error("Resource not found")]
    NotFound,
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Internal error: {0}")]
    Internal(String),
}
pub type Result<T> = std::result::Result<T, PivotServiceError>;

#[derive(Clone, Default)]
struct DocumentStore {
    data: Arc<RwLock<HashMap<Uuid, Document>>>,
}
#[derive(Clone, Default)]
struct DatabaseStore {
    data: Arc<RwLock<HashMap<Uuid, Database>>>,
}
#[derive(Clone, Default)]
struct RelationStore {
    data: Arc<RwLock<HashMap<Uuid, Relation>>>,
}

#[derive(Clone)]
pub struct PivotService {
    docs: DocumentStore,
    dbs: DatabaseStore,
    rels: RelationStore,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl PivotService {
    pub fn new(id_gen: Arc<dyn IdGenerator>, clock: Arc<dyn Clock>) -> Self {
        Self {
            docs: DocumentStore::default(),
            dbs: DatabaseStore::default(),
            rels: RelationStore::default(),
            id_gen,
            clock,
        }
    }

    pub async fn create_document(
        &self,
        _tenant_id: TenantId,
        _command_id: String,
        cmd: CreateDocumentCommand,
    ) -> Result<Document> {
        let id = self.id_gen.new_uuid_v7();
        let doc = Document {
            id,
            title: cmd.title,
            content: cmd.content,
        };
        self.docs.data.write().unwrap().insert(id, doc.clone());
        Ok(doc)
    }

    pub async fn get_document(&self, _tenant_id: TenantId, id: Uuid) -> Result<Document> {
        self.docs.data.read().unwrap().get(&id).cloned().ok_or(PivotServiceError::NotFound)
    }

    pub async fn update_document(
        &self,
        _tenant_id: TenantId,
        id: Uuid,
        _command_id: String,
        cmd: UpdateDocumentCommand,
    ) -> Result<Document> {
        let mut map = self.docs.data.write().unwrap();
        let mut doc = map.get(&id).cloned().ok_or(PivotServiceError::NotFound)?;
        if let Some(title) = cmd.title { doc.title = title; }
        if let Some(content) = cmd.content { doc.content = content; }
        map.insert(id, doc.clone());
        Ok(doc)
    }

    pub async fn delete_document(
        &self,
        _tenant_id: TenantId,
        id: Uuid,
        _command_id: String,
    ) -> Result<()> {
        if self.docs.data.write().unwrap().remove(&id).is_none() {
            return Err(PivotServiceError::NotFound);
        }
        Ok(())
    }

    pub async fn list_documents(
        &self,
        _tenant_id: TenantId,
        _params: ListDocumentsParams,
    ) -> Result<Vec<Document>> {
        let map = self.docs.data.read().unwrap();
        Ok(map.values().cloned().collect())
    }

    pub async fn search_documents(
        &self,
        _tenant_id: TenantId,
        params: SearchParams,
    ) -> Result<Vec<Document>> {
        let q = params.q.trim().to_lowercase();
        let map = self.docs.data.read().unwrap();
        if q.is_empty() {
            return Ok(map.values().cloned().collect());
        }
        let results: Vec<Document> = map
            .values()
            .filter(|d| d.title.to_lowercase().contains(&q) || d.content.to_lowercase().contains(&q))
            .cloned()
            .collect();
        Ok(results)
    }

    pub async fn get_database(&self, _tenant_id: TenantId, id: Uuid) -> Result<Database> {
        self.dbs.data.read().unwrap().get(&id).cloned().ok_or(PivotServiceError::NotFound)
    }

    pub async fn create_database(&self, _tenant_id: TenantId, name: String) -> Result<Database> {
        let id = self.id_gen.new_uuid_v7();
        let db = Database { id, name };
        self.dbs.data.write().unwrap().insert(id, db.clone());
        Ok(db)
    }

    pub async fn create_relation(
        &self,
        _tenant_id: TenantId,
        _doc_id: Uuid,
        _command_id: String,
        cmd: CreateRelationCommand,
    ) -> Result<Relation> {
        let id = self.id_gen.new_uuid_v7();
        let rel = Relation {
            id,
            from_id: cmd.from_id,
            to_id: cmd.to_id,
        };
        self.rels.data.write().unwrap().insert(id, rel.clone());
        Ok(rel)
    }

    pub async fn get_relation(&self, _tenant_id: TenantId, id: Uuid) -> Result<Relation> {
        self.rels.data.read().unwrap().get(&id).cloned().ok_or(PivotServiceError::NotFound)
    }

    pub async fn delete_relation(
        &self,
        _tenant_id: TenantId,
        id: Uuid,
        _command_id: String,
    ) -> Result<()> {
        if self.rels.data.write().unwrap().remove(&id).is_none() {
            return Err(PivotServiceError::NotFound);
        }
        Ok(())
    }

    pub async fn list_relations(
        &self,
        _tenant_id: TenantId,
        _doc_id: Uuid,
        _params: ListRelationsParams,
    ) -> Result<Vec<Relation>> {
        let map = self.rels.data.read().unwrap();
        Ok(map.values().cloned().collect())
    }
}
