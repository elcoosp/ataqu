use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "messages", schema_name = "dial")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub channel_id: Uuid,
    pub tenant_id: Uuid,
    pub author_id: Uuid,
    pub content: String,
    pub sent_at: DateTime<Utc>,
    pub edited_at: Option<DateTime<Utc>>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub thread_id: Option<Uuid>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
