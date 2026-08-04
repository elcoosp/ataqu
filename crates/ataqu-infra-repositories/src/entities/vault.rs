//! SeaORM entities for VAULT tables.
pub mod product {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "products", schema_name = "vault")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub name: String,
        pub description: String,
        pub sku: String,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub mod variant {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "variants", schema_name = "vault")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub product_id: Uuid,
        pub tenant_id: Uuid,
        pub sku: String,
        pub price: i64,
        pub stock_quantity: i64,
        pub reserved_quantity: i64,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}
