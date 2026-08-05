use crate::inventory::Warehouse;
use crate::inventory::{Product, Variant};
use crate::stock::StockMovement;
use async_trait::async_trait;
use ataqu_kernel::TenantId;
use uuid::Uuid;

#[async_trait]
pub trait VaultRepository: Send + Sync {
    async fn save_product(&self, product: &Product) -> Result<(), String>;
    async fn get_product(&self, tenant_id: &TenantId, id: &Uuid)
    -> Result<Option<Product>, String>;
    async fn list_products(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Product>, String>;
    async fn delete_product(&self, tenant_id: &TenantId, id: &Uuid) -> Result<(), String>;

    async fn save_variant(&self, variant: &Variant) -> Result<(), String>;
    async fn get_variant(&self, tenant_id: &TenantId, id: &Uuid)
    -> Result<Option<Variant>, String>;
    async fn delete_variant(&self, tenant_id: &TenantId, id: &Uuid) -> Result<(), String>;
    async fn list_variants(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Variant>, String>;
    async fn save_movement(&self, movement: &StockMovement) -> Result<(), String>;
    async fn list_movements(
        &self,
        tenant_id: &TenantId,
        variant_id: &Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<StockMovement>, String>;
    async fn find_low_stock_variants(
        &self,
        tenant_id: &TenantId,
        threshold: i64,
    ) -> Result<Vec<Variant>, String>;

    async fn save_reservation(&self, reservation: &crate::stock::Reservation)
    -> Result<(), String>;

    async fn list_warehouses(&self, tenant_id: &TenantId) -> Result<Vec<Warehouse>, String>;
    async fn save_warehouse(&self, warehouse: &Warehouse) -> Result<(), String>;
}
