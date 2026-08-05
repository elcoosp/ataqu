use rust_decimal::Decimal;
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
    pub amount: Decimal,
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
    pub activity_type: String,
    pub description: String,
    pub scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
    pub contact_id: Uuid,
    pub deal_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

fn default_custom_fields() -> serde_json::Value {
    serde_json::json!({})
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateContactRequest {
    pub name: String,
    pub company: Option<String>,
    pub email: String,
    pub phone: Option<String>,
    #[serde(default = "default_custom_fields")]
    pub custom_fields: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateContactRequest {
    pub name: Option<String>,
    pub company: Option<Option<String>>,
    pub email: Option<String>,
    pub phone: Option<Option<String>>,
    pub custom_fields: Option<serde_json::Value>,
    pub lead_score: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateDealRequest {
    pub title: String,
    pub amount: Decimal,
    pub contact_id: Uuid,
    pub pipeline_stage_id: Uuid,
    pub owner_id: Option<Uuid>,
    pub probability: Option<i32>,
    pub variant_id: Option<Uuid>,
    pub quantity: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateDealRequest {
    pub title: Option<String>,
    pub amount: Option<Decimal>,
    pub contact_id: Option<Uuid>,
    pub pipeline_stage_id: Option<Uuid>,
    pub status: Option<String>,
    pub owner_id: Option<Option<Uuid>>,
    pub probability: Option<Option<i32>>,
    pub variant_id: Option<Option<Uuid>>,
    pub quantity: Option<Option<i64>>,
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
    pub limit: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportCsvResult {
    pub imported: usize,
    pub failed: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TrackEmailRequest {
    pub contact_id: Uuid,
    pub event_type: String,
    pub metadata: serde_json::Value,
}
