//! SeaORM entities for VISTA tables.
pub mod aggregated_view {
    use chrono::{DateTime, Utc};
    use rust_decimal::Decimal;
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "aggregated_views", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub tenant_id: Uuid,
        pub total_events: i64,
        pub total_contacts: i64,
        pub total_deals: i64,
        pub total_deals_won: i64,
        pub total_pipeline_value: Decimal,
        pub total_revenue: Decimal,
        pub total_products: i64,
        pub low_stock_variants: i64,
        pub total_bookings: i64,
        pub pending_leave_requests: i64,
        pub last_updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod data_point {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

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
