//! SeaORM entities for DIAL tables.
//! Each entity is defined in its own module.

// Channel entity
pub mod channel {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "channels", schema_name = "dial")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub name: String,
        pub channel_type: String,
        pub created_by: Uuid,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
        pub archived_at: Option<DateTime<Utc>>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

// Channel participant entity (new)
pub mod channel_participant {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

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
}

// Message entity
pub mod message {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

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
}

// Thread entity
pub mod thread {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "threads", schema_name = "dial")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub channel_id: Uuid,
        pub parent_message_id: Uuid,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

// Mention entity
pub mod mention {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "mentions", schema_name = "dial")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub message_id: Uuid,
        pub user_id: Uuid,
        pub read_at: Option<DateTime<Utc>>,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

// Presence entity
pub mod presence {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

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
}
