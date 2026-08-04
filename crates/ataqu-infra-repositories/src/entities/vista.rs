//! SeaORM entities for VISTA tables.
pub mod aggregated_view {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "aggregated_views", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub tenant_id: Uuid,
        pub total_events: i64,
        pub last_updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod data_point {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
    #[sea_orm(table_name = "analytics_data_points", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub metric_name: String,
        pub value: f64,
        pub timestamp: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}
