//! VAULT inventory service – in-memory stock management.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use ataqu_kernel::{Clock, IdGenerator, TenantId};

#[derive(Debug, Clone)]
pub struct Product {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub sku: String,
    pub stock: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct Variant {
    pub id: Uuid,
    pub product_id: Uuid,
    pub tenant_id: TenantId,
    pub sku: String,
    pub stock: i64,
    pub reserved: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateVariantCommand {
    pub tenant_id: TenantId,
    pub product_id: Uuid,
    pub sku: String,
    pub initial_stock: i64,
}


#[derive(Debug, Clone)]
pub struct CreateProductCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub sku: String,
    pub initial_stock: i64,
}

#[derive(Debug, Clone)]
pub struct UpdateStockCommand {
    pub tenant_id: TenantId,
    pub product_id: Uuid,
    pub delta: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum VaultServiceError {
    #[error("Product not found")]
    ProductNotFound,
    #[error("Insufficient stock")]
    InsufficientStock,
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type VaultResult<T> = Result<T, VaultServiceError>;

#[derive(Default)]
struct ProductStore {
    products: Arc<RwLock<HashMap<Uuid, Product>>>,
}

pub struct VaultService {
    products: ProductStore,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl VaultService {
    pub fn new(id_gen: Arc<dyn IdGenerator>, clock: Arc<dyn Clock>) -> Self {
        Self {
            products: ProductStore::default(),
            id_gen,
            clock,
        }
    }

    pub async fn create_product(&self, cmd: CreateProductCommand) -> VaultResult<Product> {
        if cmd.name.trim().is_empty() {
            return Err(VaultServiceError::Validation("Name cannot be empty".into()));
        }
        if cmd.sku.trim().is_empty() {
            return Err(VaultServiceError::Validation("SKU cannot be empty".into()));
        }
        if cmd.initial_stock < 0 {
            return Err(VaultServiceError::Validation("Initial stock cannot be negative".into()));
        }
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let product = Product {
            id,
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            sku: cmd.sku,
            stock: cmd.initial_stock,
            created_at: now,
        };
        self.products.products.write().unwrap().insert(id, product.clone());
        Ok(product)
    }

    pub async fn get_product(&self, tenant_id: TenantId, id: Uuid) -> VaultResult<Product> {
        let map = self.products.products.read().unwrap();
        map.get(&id)
            .filter(|p| p.tenant_id == tenant_id)
            .cloned()
            .ok_or(VaultServiceError::ProductNotFound)
    }

    pub async fn list_products(&self, tenant_id: TenantId) -> VaultResult<Vec<Product>> {
        let map = self.products.products.read().unwrap();
        let products = map.values().filter(|p| p.tenant_id == tenant_id).cloned().collect();
        Ok(products)
    }

    pub async fn update_stock(&self, cmd: UpdateStockCommand) -> VaultResult<Product> {
        let mut map = self.products.products.write().unwrap();
        let mut product = map.get(&cmd.product_id).cloned().ok_or(VaultServiceError::ProductNotFound)?;
        if product.tenant_id != cmd.tenant_id {
            return Err(VaultServiceError::ProductNotFound);
        }
        let new_stock = product.stock + cmd.delta;
        if new_stock < 0 {
            return Err(VaultServiceError::InsufficientStock);
        }
        product.stock = new_stock;
        map.insert(cmd.product_id, product.clone());
        Ok(product)
    }
}
