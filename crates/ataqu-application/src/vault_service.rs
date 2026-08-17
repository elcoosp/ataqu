#![allow(unused_variables)]
//! VAULT application service – orchestrates products and variants using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use ataqu_domain_vault::repository::VaultRepository;
use ataqu_kernel::{Clock, IdGenerator, TenantId};

use crate::outbox::Outbox;
use ataqu_infra_repositories::vault_transaction_repo::VaultTransactionRepository;
use sea_orm::DatabaseConnection;
use ataqu_domain_aegis::repository::AuditRepositoryTrait;

pub use ataqu_domain_vault::inventory::Product;
pub use ataqu_domain_vault::inventory::Variant;
pub use ataqu_domain_vault::inventory::Warehouse;
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
    pub price: i64,
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
    pub adjustments: Vec<(Uuid, i64, i32)>, // (variant_id, delta, expected_version)
    pub reason: String,
}

#[derive(Debug, Clone)]
pub struct UpdateWarehouseCommand {
    pub tenant_id: TenantId,
    pub id: Uuid,
    pub name: Option<String>,
    pub location: Option<Option<String>>,
    pub expected_version: i32,
}

#[derive(Debug, thiserror::Error)]
pub enum VaultServiceError {
    #[error("Product not found")]
    ProductNotFound,
    #[error("Variant not found")]
    VariantNotFound,
    #[error("Warehouse not found")]
    WarehouseNotFound,
    #[error("Repository error: {0}")]
    Repository(ataqu_kernel::RepositoryError),
    #[error("Stock error: {0}")]
    Stock(#[from] ataqu_domain_vault::inventory::StockError),
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type VaultResult<T> = Result<T, VaultServiceError>;

const VAULT_SCHEMA: &str = "vault";

pub struct VaultService {
    repo: Arc<dyn VaultRepository + Send + Sync>,
    txn_repo: Arc<dyn VaultTransactionRepository + Send + Sync>,
    db: DatabaseConnection,
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
    audit_repo: Option<Arc<dyn AuditRepositoryTrait + Send + Sync>>,
}

impl VaultService {
    pub fn new(
        repo: Arc<dyn VaultRepository + Send + Sync>,
        txn_repo: Arc<dyn VaultTransactionRepository + Send + Sync>,
        db: DatabaseConnection,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
        audit_repo: Option<Arc<dyn AuditRepositoryTrait + Send + Sync>>,
    ) -> Self {
        Self {
            repo,
            txn_repo,
            db,
            outbox,
            id_gen,
            clock,
            audit_repo,
        }
    }

    pub async fn create_product(&self, user_id: Uuid, cmd: CreateProductCommand) -> VaultResult<Product> {


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
            .map_err(|e| {
                VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
            })?;

        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    product.tenant_id,
                    Uuid::nil(),
                    "create_product",
                    "vault",
                    Some("product"),
                    Some(product.id),
                    None,
                    Some(serde_json::json!({"name": product.name, "sku": product.sku})),
                    None,
                    None,
                )
                .await
                .ok();
        }

        Ok(product)
    }

    pub async fn update_product(&self, user_id: Uuid, cmd: UpdateProductCommand) -> VaultResult<Product> {


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
            .map_err(|e| {
                VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
            })?;

        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    product.tenant_id,
                    Uuid::nil(),
                    "update_product",
                    "vault",
                    Some("product"),
                    Some(product.id),
                    None,
                    Some(serde_json::json!({"name": product.name, "sku": product.sku})),
                    None,
                    None,
                )
                .await
                .ok();
        }

        Ok(product)
    }

    pub async fn delete_product(&self, user_id: Uuid, tenant_id: TenantId, id: Uuid) -> VaultResult<()> {


        self.repo
            .delete_product(&tenant_id, &id)
            .await
            .map_err(VaultServiceError::Repository)?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    tenant_id,
                    Uuid::nil(),
                    "delete_product",
                    "vault",
                    Some("product"),
                    Some(id),
                    None,
                    None,
                    None,
                    None,
                )
                .await
                .ok();
        }
        Ok(())
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
    ) -> VaultResult<(Vec<Product>, u64)> {
        let total = self
            .repo
            .count_products(&tenant_id)
            .await
            .map_err(VaultServiceError::Repository)?;
        let products = self
            .repo
            .list_products(&tenant_id, limit, offset)
            .await
            .map_err(VaultServiceError::Repository)?;
        Ok((products, total))
    }

    pub async fn create_variant(&self, user_id: Uuid, cmd: CreateVariantCommand) -> VaultResult<Variant> {


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

        if cmd.initial_stock > 0 {
            let movement = ataqu_domain_vault::stock::create_movement(
                ataqu_domain_vault::stock::CreateMovementCommand {
                    tenant_id: cmd.tenant_id,
                    variant_id: variant.id,
                    quantity: cmd.initial_stock,
                    reason: "initial_stock".to_string(),
                    reference: None,
                },
                self.id_gen.as_ref(),
                self.clock.as_ref(),
            );
            self.repo
                .save_movement(&movement)
                .await
                .map_err(VaultServiceError::Repository)?;
        }

        let payload = serde_json::json!({
            "variant_id": variant.id,
            "tenant_id": variant.tenant_id.as_uuid(),
            "product_id": variant.product_id,
            "sku": variant.sku,
            "price": variant.price,
            "stock_quantity": variant.stock_quantity,
        });
        self.outbox
            .append(VAULT_SCHEMA, "VariantCreated", variant.id, &payload)
            .await
            .map_err(|e| {
                VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
            })?;

        Ok(variant)
    }

    pub async fn get_variant(&self, tenant_id: TenantId, id: Uuid) -> VaultResult<Variant> {
        self.repo
            .get_variant(&tenant_id, &id)
            .await
            .map_err(VaultServiceError::Repository)?
            .ok_or(VaultServiceError::VariantNotFound)
    }

    pub async fn find_variant_by_sku(
        &self,
        tenant_id: TenantId,
        sku: String,
    ) -> VaultResult<Option<Variant>> {

        self.repo
            .find_variant_by_sku(&tenant_id, &sku)
            .await
            .map_err(VaultServiceError::Repository)
    }

    pub async fn update_variant(&self, user_id: Uuid, cmd: UpdateVariantCommand) -> VaultResult<Variant> {

        let variant = self.get_variant(cmd.tenant_id, cmd.id).await?;

        if variant.version != cmd.expected_version {
            return Err(VaultServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, variant.version
            )));
        }

        let mut new_variant = variant.update_variant(cmd.price, cmd.sku, self.clock.as_ref());
        new_variant.version += 1;
        self.repo
            .save_variant(&new_variant)
            .await
            .map_err(VaultServiceError::Repository)?;

        let payload = serde_json::json!({
            "variant_id": new_variant.id,
            "tenant_id": new_variant.tenant_id.as_uuid(),
            "sku": new_variant.sku,
            "price": new_variant.price,
        });
        self.outbox
            .append(VAULT_SCHEMA, "VariantUpdated", new_variant.id, &payload)
            .await
            .map_err(|e| {
                VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
            })?;

        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    new_variant.tenant_id,
                    Uuid::nil(),
                    "update_variant",
                    "vault",
                    Some("variant"),
                    Some(new_variant.id),
                    None,
                    Some(serde_json::json!({
"sku": new_variant.sku, "price": new_variant.price})),
                    None,
                    None,
                )
                .await
                .ok();
        }

        Ok(new_variant)
    }

    pub async fn delete_variant(&self, user_id: Uuid, tenant_id: TenantId, id: Uuid) -> VaultResult<()> {

        self.repo
            .delete_variant(&tenant_id, &id)
            .await
            .map_err(VaultServiceError::Repository)?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    tenant_id,
                    Uuid::nil(),
                    "delete_variant",
                    "vault",
                    Some("variant"),
                    Some(id),
                    None,
                    None,
                    None,
                    None,
                )
                .await
                .ok();
        }
        Ok(())
    }

    pub async fn list_variants(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> VaultResult<(Vec<Variant>, u64)> {
        let total = self
            .repo
            .count_variants(&tenant_id)
            .await
            .map_err(VaultServiceError::Repository)?;
        let variants = self
            .repo
            .list_variants(&tenant_id, limit, offset)
            .await
            .map_err(VaultServiceError::Repository)?;
        Ok((variants, total))
    }

    pub async fn update_stock(&self, user_id: Uuid, cmd: UpdateStockCommand) -> VaultResult<Variant> {


        use sea_orm::TransactionTrait;
        let mut txn = self.db.begin()
            .await
            .map_err(|e| VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e.to_string())))?;

        let variant = self.get_variant(cmd.tenant_id, cmd.variant_id).await?;
        if variant.version != cmd.expected_version {
            return Err(VaultServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, variant.version
            )));
        }

        let new_variant = variant.adjust_stock(cmd.delta, self.clock.as_ref())?;
        self.txn_repo.save_variant_txn(&mut txn, &new_variant)
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
        self.txn_repo.save_movement_txn(&mut txn, &movement)
            .await
            .map_err(VaultServiceError::Repository)?;

        txn.commit()
            .await
            .map_err(|e| VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e.to_string())))?;

        let stock_payload = serde_json::json!({
            "variant_id": new_variant.id,
            "tenant_id": new_variant.tenant_id.as_uuid(),
            "delta": cmd.delta,
            "new_quantity": new_variant.stock_quantity,
            "reason": movement.reason.clone(),
        });
        self.outbox
            .append(VAULT_SCHEMA, "StockAdjusted", new_variant.id, &stock_payload)
            .await
            .map_err(|e| {
                VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
            })?;

        let threshold = std::env::var("LOW_STOCK_THRESHOLD")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(5);
        if new_variant.stock_quantity <= threshold {
            let payload = serde_json::json!({
                "variant_id": new_variant.id,
                "tenant_id": new_variant.tenant_id.as_uuid(),
                "sku": new_variant.sku,
                "stock_quantity": new_variant.stock_quantity,
                "available": new_variant.available(),
                "alert_channel_id": cmd.alert_channel_id,
            });
            self.outbox
                .append(VAULT_SCHEMA, "LowStockAlert", new_variant.id, &payload)
                .await
                .map_err(|e| {
                    VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
                })?;
        }

        Ok(new_variant)
    }

    pub async fn bulk_adjust_stock(
        &self,
        cmd: BulkStockAdjustCommand,
    ) -> VaultResult<Vec<Variant>> {
        let mut updated_variants = Vec::new();
        for (variant_id, delta, expected_version) in cmd.adjustments {
            let variant = self.get_variant(cmd.tenant_id, variant_id).await?;
            if variant.version != expected_version {
                return Err(VaultServiceError::Validation(format!(
                    "Version mismatch for variant {}: expected {}, found {}",
                    variant_id, expected_version, variant.version
                )));
            }
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

            let stock_payload = serde_json::json!({
                "variant_id": new_variant.id,
                "tenant_id": new_variant.tenant_id.as_uuid(),
                "delta": delta,
                "new_quantity": new_variant.stock_quantity,
                "reason": cmd.reason.clone(),
            });
            self.outbox
                .append(
                    VAULT_SCHEMA,
                    "StockAdjusted",
                    new_variant.id,
                    &stock_payload,
                )
                .await
                .map_err(|e| {
                    VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
                })?;

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

    pub async fn create_warehouse(&self, user_id: Uuid, tenant_id: TenantId,
        name: String,
        location: Option<String>,) -> VaultResult<Warehouse> {

        let warehouse = Warehouse {
            id: self.id_gen.new_uuid_v7(),
            tenant_id,
            name,
            location,
            created_at: self.clock.now(),
            version: 0,
        };
        self.repo
            .save_warehouse(&warehouse)
            .await
            .map_err(VaultServiceError::Repository)?;

        let payload = serde_json::json!({
            "warehouse_id": warehouse.id,
            "tenant_id": warehouse.tenant_id.as_uuid(),
            "name": warehouse.name,
        });
        self.outbox
            .append(VAULT_SCHEMA, "WarehouseCreated", warehouse.id, &payload)
            .await
            .map_err(|e| {

                VaultServiceError::Repository(ataqu_kernel::RepositoryError::Database(e))
            })?;

        Ok(warehouse)
    }

    pub async fn list_warehouses(&self, tenant_id: TenantId) -> VaultResult<Vec<Warehouse>> {
        self.repo
            .list_warehouses(&tenant_id)
            .await
            .map_err(VaultServiceError::Repository)
    }

    pub async fn update_warehouse(&self, user_id: Uuid, cmd: UpdateWarehouseCommand) -> VaultResult<Warehouse> {

        let mut warehouse = self
            .repo
            .get_warehouse_by_id(&cmd.tenant_id, cmd.id)
            .await
            .map_err(VaultServiceError::Repository)?
            .ok_or(VaultServiceError::WarehouseNotFound)?;

        if warehouse.version != cmd.expected_version {
            return Err(VaultServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, warehouse.version
            )));
        }

        if let Some(name) = cmd.name {
            warehouse.name = name;
        }
        if let Some(loc) = cmd.location {
            warehouse.location = loc;
        }

        warehouse.version += 1;
        self.repo
            .update_warehouse(&warehouse)
            .await
            .map_err(VaultServiceError::Repository)?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    warehouse.tenant_id,
                    Uuid::nil(),
                    "update_warehouse",
                    "vault",
                    Some("warehouse"),
                    Some(warehouse.id),
                    None,
                    Some(serde_json::json!({
"name": warehouse.name})),
                    None,
                    None,
                )
                .await
                .ok();
        }
        Ok(warehouse)
    }

    pub async fn delete_warehouse(&self, user_id: Uuid, tenant_id: TenantId, id: Uuid) -> VaultResult<()> {

        self.repo
            .delete_warehouse(&tenant_id, &id)
            .await
            .map_err(VaultServiceError::Repository)?;
        if let Some(audit_repo) = &self.audit_repo {

            audit_repo
                .append_log(
                    tenant_id,
                    Uuid::nil(),
                    "delete_warehouse",
                    "vault",
                    Some("warehouse"),
                    Some(id),
                    None,
                    None,
                    None,
                    None,
                )
                .await
                .ok();
        }
        Ok(())
    }

    pub async fn reserve_stock(&self, user_id: Uuid, tenant_id: TenantId,
        variant_id: Uuid,
        quantity: i64,
        expected_version: i32,) -> VaultResult<(Variant, ataqu_domain_vault::stock::Reservation)> {

        let variant = self.get_variant(tenant_id, variant_id).await?;
        if variant.version != expected_version {
            return Err(VaultServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, variant.version
            )));
        }
        if variant.available() < quantity {
            return Err(VaultServiceError::Stock(
                ataqu_domain_vault::inventory::StockError::InsufficientStock {
                    variant_id,
                    available: variant.available(),
                    requested: quantity,
                },
            ));
        }

        let expires_at = Some(self.clock.now() + std::time::Duration::from_secs(15 * 60));
        let reservation = ataqu_domain_vault::stock::create_reservation(
            ataqu_domain_vault::stock::CreateReservationCommand {
                tenant_id,
                variant_id,
                quantity,
                expires_at,
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
        new_variant.version += 1;
        self.repo
            .save_variant(&new_variant)
            .await
            .map_err(VaultServiceError::Repository)?;
        Ok((new_variant, reservation))
    }

    pub async fn reap_expired_reservations(&self) -> VaultResult<()> {
        let now = self.clock.now();
        let expired = self
            .repo
            .find_expired_reservations(now)
            .await
            .map_err(VaultServiceError::Repository)?;

        for reservation in expired {
            let variant = match self
                .get_variant(reservation.tenant_id, reservation.variant_id)
                .await
            {
                Ok(v) => v,
                Err(_) => continue,
            };

            let mut new_variant = variant.clone();
            new_variant.reserved_quantity -= reservation.quantity;
            if new_variant.reserved_quantity < 0 {
                new_variant.reserved_quantity = 0;
            }
            new_variant.updated_at = now;
            new_variant.version += 1;

            self.repo
                .save_variant(&new_variant)
                .await
                .map_err(VaultServiceError::Repository)?;

            self.repo
                .delete_reservation(reservation.tenant_id, reservation.id)
                .await
                .map_err(VaultServiceError::Repository)?;
        }
        Ok(())
    }
}
