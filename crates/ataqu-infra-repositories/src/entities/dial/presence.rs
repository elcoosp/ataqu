use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "presence", schema_name = "dial")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub tenant_id: Uuid,
    #[sea_orm(primary_key)]
    pub user_id: Uuid,
    pub status: String,
    pub last_seen: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
