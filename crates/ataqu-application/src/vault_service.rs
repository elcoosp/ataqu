//! VAULT application service – orchestrates products and variants using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use ataqu_domain_vault::repository::VaultRepository;
use ataqu_kernel::{Clock, IdGenerator, TenantId};

// Re-export domain types for API layer
pub use ataqu_domain_vault::inventory::Product;
pub use ataqu_domain_vault::inventory::Variant;

#[derive(Debug, Clone)]
pub struct CreateProductCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub description: String,
    pub sku: String,
}

#[derive(Debug, Clone)]
pub struct CreateVariantCommand {
    pub tenant_id: TenantId,
    pub product_id: Uuid,
    pub sku: String,
    pub initial_stock: i64,
    pub price: i64, // in cents
}

#[derive(Debug, Clone)]
pub struct UpdateStockCommand {
    pub tenant_id: TenantId,
    pub variant_id: Uuid,
    pub delta: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum VaultServiceError {
    #[error("Product not found")]
    ProductNotFound,
    #[error("Variant not found")]
    VariantNotFound,
    #[error("Repository error: {0}")]
    Repository(String),
    #[error("Stock error: {0}")]
    Stock(#[from] ataqu_domain_vault::inventory::StockError),
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type VaultResult<T> = Result<T, VaultServiceError>;

pub struct VaultService {
    repo: Arc<dyn VaultRepository + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl VaultService {
    pub fn new(
        repo: Arc<dyn VaultRepository + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            repo,
            id_gen,
            clock,
        }
    }

    pub async fn create_product(&self, cmd: CreateProductCommand) -> VaultResult<Product> {
        if cmd.name.trim().is_empty() {
            return Err(VaultServiceError::Validation(
                "Name cannot be empty".to_string(),
            ));
        }
        let id = self.id_gen.new_uuid_v7();
        let product = Product::new(
            id,
            cmd.tenant_id,
            cmd.name,
            cmd.description,
            cmd.sku,
            self.clock.as_ref(),
        );
        self.repo
            .save_product(&product)
            .await
            .map_err(VaultServiceError::Repository)?;
        Ok(product)
    }

    pub async fn get_product(&self, tenant_id: TenantId, id: Uuid) -> VaultResult<Product> {
        self.repo
            .get_product(&tenant_id, &id)
            .await
            .map_err(VaultServiceError::Repository)?
            .ok_or(VaultServiceError::ProductNotFound)
    }

    pub async fn list_products(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> VaultResult<Vec<Product>> {
        self.repo
            .list_products(&tenant_id, limit, offset)
            .await
            .map_err(VaultServiceError::Repository)
    }

    pub async fn create_variant(&self, cmd: CreateVariantCommand) -> VaultResult<Variant> {
        if cmd.sku.trim().is_empty() {
            return Err(VaultServiceError::Validation(
                "SKU cannot be empty".to_string(),
            ));
        }
        if cmd.initial_stock < 0 {
            return Err(VaultServiceError::Validation(
                "Initial stock cannot be negative".to_string(),
            ));
        }
        if cmd.price < 0 {
            return Err(VaultServiceError::Validation(
                "Price cannot be negative".to_string(),
            ));
        }
        // Validate product exists
        let _ = self.get_product(cmd.tenant_id, cmd.product_id).await?;
        let id = self.id_gen.new_uuid_v7();
        let mut variant = Variant::new(
            id,
            cmd.tenant_id,
            cmd.product_id,
            cmd.sku,
            cmd.price,
            self.clock.as_ref(),
        );
        variant.stock_quantity = cmd.initial_stock;
        self.repo
            .save_variant(&variant)
            .await
            .map_err(VaultServiceError::Repository)?;
        Ok(variant)
    }

    pub async fn get_variant(&self, tenant_id: TenantId, id: Uuid) -> VaultResult<Variant> {
        self.repo
            .get_variant(&tenant_id, &id)
            .await
            .map_err(VaultServiceError::Repository)?
            .ok_or(VaultServiceError::VariantNotFound)
    }

    pub async fn list_variants(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> VaultResult<Vec<Variant>> {
        self.repo
            .list_variants(&tenant_id, limit, offset)
            .await
            .map_err(VaultServiceError::Repository)
    }

    pub async fn update_stock(&self, cmd: UpdateStockCommand) -> VaultResult<Variant> {
        let variant = self.get_variant(cmd.tenant_id, cmd.variant_id).await?;
        let new_variant = variant.adjust_stock(cmd.delta, self.clock.as_ref())?;
        self.repo
            .save_variant(&new_variant)
            .await
            .map_err(VaultServiceError::Repository)?;
        Ok(new_variant)
    }
}
