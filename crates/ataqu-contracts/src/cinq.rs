use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactResponse {
    pub id: Uuid,
    pub name: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DealResponse {
    pub id: Uuid,
    pub title: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStageResponse {
    pub id: Uuid,
    pub name: String,
    pub order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityResponse {
    pub id: Uuid,
    pub description: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateContactRequest {
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateContactRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<Option<String>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateDealRequest {
    pub title: String,
    pub amount: f64,
    pub contact_id: Uuid,
    pub pipeline_stage_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateDealRequest {
    pub title: Option<String>,
    pub amount: Option<f64>,
    pub contact_id: Option<Uuid>,
    pub pipeline_stage_id: Option<Uuid>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePipelineStageRequest {
    pub name: String,
    pub order: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePipelineStageRequest {
    pub name: Option<String>,
    pub order: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateActivityRequest {
    pub contact_id: Uuid,
    pub deal_id: Option<Uuid>,
    pub activity_type: String,
    pub description: String,
    pub scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListActivitiesParams {
    pub contact_id: Option<Uuid>,
    pub limit: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SearchParams {
    pub q: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportCsvResult {
    pub imported: usize,
    pub failed: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TrackEmailRequest {
    pub contact_id: uuid::Uuid,
    pub event_type: String,
    pub metadata: serde_json::Value,
}
