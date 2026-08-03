//! SeaORM entities for SOND tables.
use sea_orm::entity::prelude::*;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde_json::Value as JsonValue;

pub mod form {
    use super::*;
    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "forms", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub title: String,
        pub description: Option<String>,
        pub schema_json: JsonValue,
        pub is_active: bool,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }
    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}
    impl ActiveModelBehavior for ActiveModel {}
}

pub mod submission {
    use super::*;
    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "submissions", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub form_id: Uuid,
        pub respondent_id: Option<Uuid>,
        pub response_data: JsonValue,
        pub submitted_at: DateTime<Utc>,
    }
    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}
    impl ActiveModelBehavior for ActiveModel {}
}
