//! SeaORM entities for PIVOT tables.
//! Each entity is defined in its own module.

pub mod document {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};
    use serde_json::Value as JsonValue;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "documents", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub title: String,
        pub content: Option<String>,
        pub metadata: Option<JsonValue>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod block {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};
    use serde_json::Value as JsonValue;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "blocks", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub document_id: Uuid,
        pub block_type: String,
        pub content: JsonValue,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod relation {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "relations", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub from_block_id: Uuid,
        pub to_block_id: Uuid,
        pub relation_type: String,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}
