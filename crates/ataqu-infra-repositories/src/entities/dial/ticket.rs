use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "tickets", schema_name = "dial")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub subject: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub requester_name: String,
    pub requester_email: String,
    pub assignee_id: Option<Uuid>,
    pub channel_type: Option<String>,
    pub message_id: Option<Uuid>,
    pub last_message: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}