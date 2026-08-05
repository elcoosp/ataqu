//! VAULT application service – orchestrates products and variants using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use ataqu_domain_vault::repository::VaultRepository;
use ataqu_kernel::{Clock, IdGenerator, TenantId};

use crate::outbox::Outbox;

// Re-export domain types for API layer
pub use ataqu_domain_vault::inventory::Product;
pub use ataqu_domain_vault::inventory::Variant;
pub use ataqu_domain_vault::stock::StockMovement;

#[derive(Debug, Clone)]
pub struct CreateProductCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub description: String,
    pub sku: String,
}

#[derive(Debug, Clone)]
pub struct UpdateProductCommand {
    pub tenant_id: TenantId,
    pub id: Uuid,
    pub name: Option<String>,
    pub description: Option<String>,
    pub sku: Option<String>,
    pub expected_version: i32,
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
    pub reason: String,
    pub reference: Option<String>,
    pub alert_channel_id: Option<Uuid>,
    pub expected_version: i32,
}

#[derive(Debug, Clone)]
pub struct UpdateVariantCommand {
    pub tenant_id: TenantId,
    pub id: Uuid,
    pub price: Option<i64>,
    pub sku: Option<String>,
    pub expected_version: i32,
}

#[derive(Debug, Clone)]
pub struct BulkStockAdjustCommand {
    pub tenant_id: TenantId,
    pub adjustments: Vec<(Uuid, i64)>,
    pub reason: String,
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

const VAULT_SCHEMA: &str = "vault";

pub struct VaultService {
    repo: Arc<dyn VaultRepository + Send + Sync>,
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl VaultService {
    pub fn new(
        repo: Arc<dyn VaultRepository + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            repo,
            outbox,
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

        let payload = serde_json::json!({
            "product_id": product.id,
            "tenant_id": product.tenant_id.as_uuid(),
            "name": product.name,
            "sku": product.sku,
        });
        self.outbox
            .append(VAULT_SCHEMA, "ProductCreated", product.id, &payload)
            .await
            .map_err(|e| VaultServiceError::Repository(e))?;

        Ok(product)
    }

    pub async fn update_product(&self, cmd: UpdateProductCommand) -> VaultResult<Product> {
        let mut product = self.get_product(cmd.tenant_id, cmd.id).await?;

        if product.version != cmd.expected_version {
            return Err(VaultServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, product.version
            )));
        }

        if let Some(name) = cmd.name {
            product.name = name;
        }
        if let Some(desc) = cmd.description {
            product.description = desc;
        }
        if let Some(sku) = cmd.sku {
            product.sku = sku;
        }
        product.updated_at = self.clock.now();
        product.version += 1;

        self.repo
            .save_product(&product)
            .await
            .map_err(VaultServiceError::Repository)?;

        let payload = serde_json::json!({
            "product_id": product.id,
            "tenant_id": product.tenant_id.as_uuid(),
            "name": product.name,
            "sku": product.sku,
        });
        self.outbox
            .append(VAULT_SCHEMA, "ProductUpdated", product.id, &payload)
            .await
            .map_err(|e| VaultServiceError::Repository(e))?;

        Ok(product)
    }

    pub async fn delete_product(&self, tenant_id: TenantId, id: Uuid) -> VaultResult<()> {
        self.repo
            .delete_product(&tenant_id, &id)
            .await
            .map_err(VaultServiceError::Repository)
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

    pub async fn update_variant(&self, cmd: UpdateVariantCommand) -> VaultResult<Variant> {
        let variant = self.get_variant(cmd.tenant_id, cmd.id).await?;

        if variant.version != cmd.expected_version {
            return Err(VaultServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, variant.version
            )));
        }

        let new_variant = variant.update_variant(cmd.price, cmd.sku, self.clock.as_ref());
        self.repo
            .save_variant(&new_variant)
            .await
            .map_err(VaultServiceError::Repository)?;
        Ok(new_variant)
    }

    pub async fn delete_variant(&self, tenant_id: TenantId, id: Uuid) -> VaultResult<()> {
        self.repo
            .delete_variant(&tenant_id, &id)
            .await
            .map_err(VaultServiceError::Repository)
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

        if variant.version != cmd.expected_version {
            return Err(VaultServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, variant.version
            )));
        }

        let new_variant = variant.adjust_stock(cmd.delta, self.clock.as_ref())?;
        self.repo
            .save_variant(&new_variant)
            .await
            .map_err(VaultServiceError::Repository)?;

        let movement = ataqu_domain_vault::stock::create_movement(
            ataqu_domain_vault::stock::CreateMovementCommand {
                tenant_id: cmd.tenant_id,
                variant_id: cmd.variant_id,
                quantity: cmd.delta,
                reason: cmd.reason,
                reference: cmd.reference,
            },
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        );
        self.repo
            .save_movement(&movement)
            .await
            .map_err(VaultServiceError::Repository)?;

        if new_variant.stock_quantity <= 5 {
            let payload = serde_json::json!({
                "variant_id": new_variant.id,
                "tenant_id": new_variant.tenant_id.as_uuid(),
                "sku": new_variant.sku,
                "stock_quantity": new_variant.stock_quantity,
                "available": new_variant.available(),
            });
            self.outbox
                .append(VAULT_SCHEMA, "LowStockAlert", new_variant.id, &payload)
                .await
                .map_err(|e| VaultServiceError::Repository(e))?;
        }

        Ok(new_variant)
    }

    pub async fn bulk_adjust_stock(
        &self,
        cmd: BulkStockAdjustCommand,
    ) -> VaultResult<Vec<Variant>> {
        let mut updated_variants = Vec::new();
        for (variant_id, delta) in cmd.adjustments {
            let variant = self.get_variant(cmd.tenant_id, variant_id).await?;
            let new_variant = variant.adjust_stock(delta, self.clock.as_ref())?;
            self.repo
                .save_variant(&new_variant)
                .await
                .map_err(VaultServiceError::Repository)?;

            let movement = ataqu_domain_vault::stock::create_movement(
                ataqu_domain_vault::stock::CreateMovementCommand {
                    tenant_id: cmd.tenant_id,
                    variant_id,
                    quantity: delta,
                    reason: cmd.reason.clone(),
                    reference: None,
                },
                self.id_gen.as_ref(),
                self.clock.as_ref(),
            );
            self.repo
                .save_movement(&movement)
                .await
                .map_err(VaultServiceError::Repository)?;

            updated_variants.push(new_variant);
        }
        Ok(updated_variants)
    }

    pub async fn list_movements(
        &self,
        tenant_id: TenantId,
        variant_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> VaultResult<Vec<StockMovement>> {
        self.repo
            .list_movements(&tenant_id, &variant_id, limit, offset)
            .await
            .map_err(VaultServiceError::Repository)
    }

    pub async fn find_low_stock_variants(
        &self,
        tenant_id: TenantId,
        threshold: i64,
    ) -> VaultResult<Vec<Variant>> {
        self.repo
            .find_low_stock_variants(&tenant_id, threshold)
            .await
            .map_err(VaultServiceError::Repository)
    }

    pub async fn create_warehouse(
        &self,
        tenant_id: TenantId,
        name: String,
        location: Option<String>,
    ) -> VaultResult<ataqu_domain_vault::inventory::Warehouse> {
        let warehouse = ataqu_domain_vault::inventory::Warehouse {
            id: self.id_gen.new_uuid_v7(),
            tenant_id,
            name,
            location,
            created_at: self.clock.now(),
        };
        self.repo
            .save_warehouse(&warehouse)
            .await
            .map_err(VaultServiceError::Repository)?;
        Ok(warehouse)
    }

    pub async fn list_warehouses(
        &self,
        tenant_id: TenantId,
    ) -> VaultResult<Vec<ataqu_domain_vault::inventory::Warehouse>> {
        self.repo
            .list_warehouses(&tenant_id)
            .await
            .map_err(VaultServiceError::Repository)
    }

    pub async fn reserve_stock(
        &self,
        tenant_id: TenantId,
        variant_id: Uuid,
        quantity: i64,
    ) -> VaultResult<Variant> {
        let variant = self.get_variant(tenant_id, variant_id).await?;
        if variant.available() < quantity {
            return Err(VaultServiceError::Stock(
                ataqu_domain_vault::inventory::StockError::InsufficientStock {
                    variant_id,
                    available: variant.available(),
                    requested: quantity,
                },
            ));
        }

        let reservation = ataqu_domain_vault::stock::create_reservation(
            ataqu_domain_vault::stock::CreateReservationCommand {
                tenant_id,
                variant_id,
                quantity,
                expires_at: None,
            },
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        );
        self.repo
            .save_reservation(&reservation)
            .await
            .map_err(VaultServiceError::Repository)?;

        let mut new_variant = variant.clone();
        new_variant.reserved_quantity += quantity;
        new_variant.updated_at = self.clock.now();
        self.repo
            .save_variant(&new_variant)
            .await
            .map_err(VaultServiceError::Repository)?;
        Ok(new_variant)
    }
}
