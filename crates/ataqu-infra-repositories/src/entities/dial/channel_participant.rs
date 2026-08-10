use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "channel_participants", schema_name = "dial")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub channel_id: Uuid,
    #[sea_orm(primary_key)]
    pub user_id: Uuid,
    pub joined_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
