use async_trait::async_trait;
use ataqu_domain_vault::inventory::{Product, Variant};
use ataqu_domain_vault::repository::VaultRepository;
use ataqu_domain_vault::stock::StockMovement;
use ataqu_kernel::TenantId;
use sea_orm::ConnectionTrait;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, Set};
use uuid::Uuid;

mod product_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

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
        pub version: i32,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod variant_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "variants", schema_name = "vault")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub product_id: Uuid,
        pub sku: String,
        pub price: i64,
        pub stock_quantity: i64,
        pub reserved_quantity: i64,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
        pub version: i32,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod stock_movement_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "stock_movements", schema_name = "vault")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub variant_id: Uuid,
        pub quantity: i64,
        pub reason: String,
        pub reference: Option<String>,
        pub timestamp: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub struct VaultRepositoryImpl {
    db: DatabaseConnection,
}

impl VaultRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn product_domain_to_active(product: &Product) -> product_entity::ActiveModel {
    product_entity::ActiveModel {
        id: Set(product.id),
        tenant_id: Set(product.tenant_id.as_uuid()),
        name: Set(product.name.clone()),
        description: Set(product.description.clone()),
        sku: Set(product.sku.clone()),
        created_at: Set(product.created_at.into()),
        updated_at: Set(product.updated_at.into()),
        version: Set(product.version),
    }
}

fn product_model_to_domain(model: product_entity::Model) -> Product {
    Product {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        name: model.name,
        description: model.description,
        sku: model.sku,
        created_at: model.created_at.into(),
        updated_at: model.updated_at.into(),
        version: model.version,
    }
}

fn variant_domain_to_active(variant: &Variant) -> variant_entity::ActiveModel {
    variant_entity::ActiveModel {
        id: Set(variant.id),
        product_id: Set(variant.product_id),
        tenant_id: Set(variant.tenant_id.as_uuid()),
        sku: Set(variant.sku.clone()),
        price: Set(variant.price),
        stock_quantity: Set(variant.stock_quantity),
        reserved_quantity: Set(variant.reserved_quantity),
        created_at: Set(variant.created_at.into()),
        updated_at: Set(variant.updated_at.into()),
        version: Set(variant.version),
    }
}

fn variant_model_to_domain(model: variant_entity::Model) -> Variant {
    Variant {
        id: model.id,
        product_id: model.product_id,
        tenant_id: TenantId::new(model.tenant_id),
        sku: model.sku,
        price: model.price,
        stock_quantity: model.stock_quantity,
        reserved_quantity: model.reserved_quantity,
        low_stock_threshold: 5,
        created_at: model.created_at.into(),
        updated_at: model.updated_at.into(),
        version: model.version,
    }
}

#[async_trait]
impl VaultRepository for VaultRepositoryImpl {
    async fn save_product(&self, product: &Product) -> Result<(), String> {
        let active = product_domain_to_active(product);
        let exists = product_entity::Entity::find_by_id(product.id)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .is_some();
        if exists {
            product_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        } else {
            product_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    async fn get_product(
        &self,
        tenant_id: &TenantId,
        id: &Uuid,
    ) -> Result<Option<Product>, String> {
        let model = product_entity::Entity::find()
            .filter(product_entity::Column::Id.eq(*id))
            .filter(product_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(model.map(product_model_to_domain))
    }

    async fn list_products(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Product>, String> {
        let models = product_entity::Entity::find()
            .filter(product_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models.into_iter().map(product_model_to_domain).collect())
    }

    async fn delete_product(&self, tenant_id: &TenantId, id: &Uuid) -> Result<(), String> {
        product_entity::Entity::delete_many()
            .filter(product_entity::Column::Id.eq(*id))
            .filter(product_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn save_variant(&self, variant: &Variant) -> Result<(), String> {
        let active = variant_domain_to_active(variant);
        let exists = variant_entity::Entity::find_by_id(variant.id)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .is_some();
        if exists {
            variant_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        } else {
            variant_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    async fn get_variant(
        &self,
        tenant_id: &TenantId,
        id: &Uuid,
    ) -> Result<Option<Variant>, String> {
        let model = variant_entity::Entity::find()
            .filter(variant_entity::Column::Id.eq(*id))
            .filter(variant_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(model.map(variant_model_to_domain))
    }

    async fn list_variants(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Variant>, String> {
        let models = variant_entity::Entity::find()
            .filter(variant_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models.into_iter().map(variant_model_to_domain).collect())
    }

    async fn delete_variant(&self, tenant_id: &TenantId, id: &Uuid) -> Result<(), String> {
        variant_entity::Entity::delete_many()
            .filter(variant_entity::Column::Id.eq(*id))
            .filter(variant_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn save_movement(&self, movement: &StockMovement) -> Result<(), String> {
        let active = stock_movement_entity::ActiveModel {
            id: Set(movement.id),
            tenant_id: Set(movement.tenant_id.as_uuid()),
            variant_id: Set(movement.variant_id),
            quantity: Set(movement.quantity),
            reason: Set(movement.reason.clone()),
            reference: Set(movement.reference.clone()),
            timestamp: Set(movement.timestamp.into()),
        };
        stock_movement_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_movements(
        &self,
        tenant_id: &TenantId,
        variant_id: &Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<StockMovement>, String> {
        let models = stock_movement_entity::Entity::find()
            .filter(stock_movement_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(stock_movement_entity::Column::VariantId.eq(*variant_id))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(models
            .into_iter()
            .map(|m| StockMovement {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                variant_id: m.variant_id,
                quantity: m.quantity,
                reason: m.reason,
                reference: m.reference,
                timestamp: m.timestamp.into(),
            })
            .collect())
    }

    async fn find_low_stock_variants(
        &self,
        tenant_id: &TenantId,
        threshold: i64,
    ) -> Result<Vec<Variant>, String> {
        let models = variant_entity::Entity::find()
            .filter(variant_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(variant_entity::Column::StockQuantity.lte(threshold))
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(models.into_iter().map(variant_model_to_domain).collect())
    }

    async fn save_reservation(
        &self,
        reservation: &ataqu_domain_vault::stock::Reservation,
    ) -> Result<(), String> {
        let created_at: chrono::DateTime<chrono::Utc> = reservation.created_at.into();
        let expires_at: Option<chrono::DateTime<chrono::Utc>> =
            reservation.expires_at.map(|t| t.into());
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            r#"INSERT INTO vault.reservations (id, tenant_id, variant_id, quantity, status, expires_at, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
            vec![
                reservation.id.into(),
                reservation.tenant_id.as_uuid().into(),
                reservation.variant_id.into(),
                reservation.quantity.into(),
                format!("{:?}", reservation.status).to_lowercase().into(),
                expires_at.into(),
                created_at.into(),
            ],
        );
        self.db.execute_raw(stmt).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_warehouses(
        &self,
        tenant_id: &ataqu_kernel::TenantId,
    ) -> Result<Vec<ataqu_domain_vault::inventory::Warehouse>, String> {
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "SELECT id, tenant_id, name, location, created_at FROM vault.warehouses WHERE tenant_id = $1",
            vec![tenant_id.as_uuid().into()],
        );
        let rows = self
            .db
            .query_all_raw(stmt)
            .await
            .map_err(|e| e.to_string())?;
        let mut whs = Vec::new();
        for row in rows {
            let created_at: chrono::DateTime<chrono::Utc> =
                row.try_get("", "created_at").map_err(|e| e.to_string())?;
            whs.push(ataqu_domain_vault::inventory::Warehouse {
                id: row.try_get("", "id").map_err(|e| e.to_string())?,
                tenant_id: ataqu_kernel::TenantId::new(
                    row.try_get("", "tenant_id").map_err(|e| e.to_string())?,
                ),
                name: row.try_get("", "name").map_err(|e| e.to_string())?,
                location: row.try_get("", "location").map_err(|e| e.to_string())?,
                created_at: created_at.into(),
            });
        }
        Ok(whs)
    }

    async fn save_warehouse(
        &self,
        warehouse: &ataqu_domain_vault::inventory::Warehouse,
    ) -> Result<(), String> {
        let created_at: chrono::DateTime<chrono::Utc> = warehouse.created_at.into();
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "INSERT INTO vault.warehouses (id, tenant_id, name, location, created_at) VALUES ($1, $2, $3, $4, $5)",
            vec![
                warehouse.id.into(),
                warehouse.tenant_id.as_uuid().into(),
                warehouse.name.clone().into(),
                warehouse.location.clone().into(),
                created_at.into(),
            ],
        );
        self.db.execute_raw(stmt).await.map_err(|e| e.to_string())?;
        Ok(())
    }
}
