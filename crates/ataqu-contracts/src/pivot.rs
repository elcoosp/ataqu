use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Database {
    pub id: Uuid,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relation {
    pub id: Uuid,
    pub from_id: Uuid,
    pub to_id: Uuid,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateDocumentCommand {
    pub title: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateDocumentCommand {
    pub title: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateRelationCommand {
    pub from_id: Uuid,
    pub to_id: Uuid,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListDocumentsParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListRelationsParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SearchParams {
    pub q: String,
}
