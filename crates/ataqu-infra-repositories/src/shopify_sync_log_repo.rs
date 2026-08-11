//! Repository for Shopify sync logs.
use sea_orm::{DatabaseConnection, EntityTrait, IntoActiveModel, Set};
use uuid::Uuid;

use ataqu_kernel::TenantId;

mod shopify_sync_log_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "shopify_sync_logs", schema_name = "vault")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: i64,
        pub tenant_id: Uuid,
        pub sync_type: String,
        pub status: String,
        pub product_id: Option<Uuid>,
        pub shopify_id: Option<i64>,
        pub error_message: Option<String>,
        pub retry_count: i32,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub struct ShopifySyncLogRepo {
    db: DatabaseConnection,
}

impl ShopifySyncLogRepo {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn log_sync_start(
        &self,
        tenant_id: TenantId,
        sync_type: &str,
    ) -> Result<i64, String> {
        use shopify_sync_log_entity as entity;
        let active = entity::ActiveModel {
            tenant_id: Set(tenant_id.as_uuid()),
            sync_type: Set(sync_type.to_string()),
            status: Set("started".to_string()),
            product_id: Set(None),
            shopify_id: Set(None),
            error_message: Set(None),
            retry_count: Set(0),
            created_at: Set(chrono::Utc::now()),
            ..Default::default()
        };
        let result = entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(result.last_insert_id)
    }

    pub async fn log_sync_success(
        &self,
        log_id: i64,
        product_id: Option<Uuid>,
        shopify_id: Option<i64>,
    ) -> Result<(), String> {
        use shopify_sync_log_entity as entity;
        let mut active = entity::Entity::find_by_id(log_id)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Log entry not found")?
            .into_active_model();
        active.status = Set("success".to_string());
        active.product_id = Set(product_id);
        active.shopify_id = Set(shopify_id);
        entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn log_sync_error(
        &self,
        log_id: i64,
        error_message: &str,
        retry_count: i32,
    ) -> Result<(), String> {
        use shopify_sync_log_entity as entity;
        let mut active = entity::Entity::find_by_id(log_id)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Log entry not found")?
            .into_active_model();
        active.status = Set("failed".to_string());
        active.error_message = Set(Some(error_message.to_string()));
        active.retry_count = Set(retry_count);
        entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
