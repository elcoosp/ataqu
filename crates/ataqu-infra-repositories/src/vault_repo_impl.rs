//! SeaORM implementations for VAULT domain repository.
use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
    QuerySelect, Set,
};
use uuid::Uuid;

use ataqu_domain_vault::inventory::{Product, Variant};
use ataqu_domain_vault::repository::VaultRepository;
use ataqu_kernel::TenantId;

use crate::entities::vault::product as product_entity;
use crate::entities::vault::variant as variant_entity;

// Helpers
fn product_to_model(product: &Product) -> product_entity::ActiveModel {
    product_entity::ActiveModel {
        id: Set(product.id),
        tenant_id: Set(product.tenant_id.as_uuid()),
        name: Set(product.name.clone()),
        description: Set(product.description.clone()),
        sku: Set(product.sku.clone()),
        created_at: Set(product.created_at.into()),
        updated_at: Set(product.updated_at.into()),
    }
}

fn model_to_product(model: product_entity::Model) -> Product {
    Product {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        name: model.name,
        description: model.description,
        sku: model.sku,
        created_at: model.created_at.into(),
        updated_at: model.updated_at.into(),
    }
}

fn variant_to_model(variant: &Variant) -> variant_entity::ActiveModel {
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
    }
}

fn model_to_variant(model: variant_entity::Model) -> Variant {
    Variant {
        id: model.id,
        product_id: model.product_id,
        tenant_id: TenantId::new(model.tenant_id),
        sku: model.sku,
        price: model.price,
        stock_quantity: model.stock_quantity,
        reserved_quantity: model.reserved_quantity,
        created_at: model.created_at.into(),
        updated_at: model.updated_at.into(),
    }
}

pub struct VaultRepositoryImpl {
    db: DatabaseConnection,
}

impl VaultRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl VaultRepository for VaultRepositoryImpl {
    async fn save_product(&self, product: &Product) -> Result<(), String> {
        let active = product_to_model(product);
        product_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
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
        Ok(model.map(model_to_product))
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
        Ok(models.into_iter().map(model_to_product).collect())
    }

    async fn save_variant(&self, variant: &Variant) -> Result<(), String> {
        let active = variant_to_model(variant);
        variant_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
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
        Ok(model.map(model_to_variant))
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
        Ok(models.into_iter().map(model_to_variant).collect())
    }

    async fn update_variant_stock(
        &self,
        tenant_id: &TenantId,
        id: &Uuid,
        delta: i64,
    ) -> Result<Variant, String> {
        let mut active = variant_entity::Entity::find()
            .filter(variant_entity::Column::Id.eq(*id))
            .filter(variant_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Variant not found".to_string())?
            .into_active_model();
        let new_stock = active.stock_quantity.unwrap() + delta;
        if new_stock < 0 {
            return Err("Insufficient stock".to_string());
        }
        active.stock_quantity = Set(new_stock);
        active.update(&self.db).await.map_err(|e| e.to_string())?;
        self.get_variant(tenant_id, id)
            .await?
            .ok_or_else(|| "Variant not found after update".to_string())
    }
}
