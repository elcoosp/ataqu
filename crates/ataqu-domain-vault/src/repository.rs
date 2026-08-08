use async_trait::async_trait;
use std::time::SystemTime;
use uuid::Uuid;

use crate::inventory::{Product, Variant, Warehouse};
use crate::stock::{Reservation, StockMovement};
use ataqu_kernel::{RepositoryError, TenantId};

#[async_trait]
pub trait VaultRepository: Send + Sync {
    async fn save_product(&self, product: &Product) -> Result<(), RepositoryError>;
    async fn get_product(
        &self,
        tenant_id: &TenantId,
        id: &Uuid,
    ) -> Result<Option<Product>, RepositoryError>;
    async fn list_products(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Product>, RepositoryError>;
    async fn delete_product(&self, tenant_id: &TenantId, id: &Uuid) -> Result<(), RepositoryError>;

    async fn save_variant(&self, variant: &Variant) -> Result<(), RepositoryError>;
    async fn get_variant(
        &self,
        tenant_id: &TenantId,
        id: &Uuid,
    ) -> Result<Option<Variant>, RepositoryError>;
    async fn list_variants(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Variant>, RepositoryError>;
    async fn delete_variant(&self, tenant_id: &TenantId, id: &Uuid) -> Result<(), RepositoryError>;
    async fn find_low_stock_variants(
        &self,
        tenant_id: &TenantId,
        threshold: i64,
    ) -> Result<Vec<Variant>, RepositoryError>;

    async fn save_warehouse(&self, warehouse: &Warehouse) -> Result<(), RepositoryError>;
    async fn list_warehouses(
        &self,
        tenant_id: &TenantId,
    ) -> Result<Vec<Warehouse>, RepositoryError>;
    async fn update_warehouse(&self, warehouse: &Warehouse) -> Result<(), RepositoryError>;
    async fn delete_warehouse(
        &self,
        tenant_id: &TenantId,
        id: &Uuid,
    ) -> Result<(), RepositoryError>;

    async fn save_movement(&self, movement: &StockMovement) -> Result<(), RepositoryError>;
    async fn list_movements(
        &self,
        tenant_id: &TenantId,
        variant_id: &Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<StockMovement>, RepositoryError>;

    async fn save_reservation(&self, reservation: &Reservation) -> Result<(), RepositoryError>;

    async fn find_expired_reservations(
        &self,
        now: SystemTime,
    ) -> Result<Vec<Reservation>, RepositoryError>;

    async fn delete_reservation(
        &self,
        tenant_id: TenantId,
        reservation_id: Uuid,
    ) -> Result<(), RepositoryError>;
}
