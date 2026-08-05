//! Inventory domain: Products and Variants.
use ataqu_kernel::{Clock, TenantId};
use std::time::SystemTime;
use thiserror::Error;
use uuid::Uuid;

/// A product in the inventory.
#[derive(Debug, Clone, PartialEq)]
pub struct Product {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub description: String,
    pub sku: String,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

impl Product {
    pub fn new(
        id: Uuid,
        tenant_id: TenantId,
        name: String,
        description: String,
        sku: String,
        clock: &dyn Clock,
    ) -> Self {
        let now = clock.now();
        Self {
            id,
            tenant_id,
            name,
            description,
            sku,
            created_at: now,
            updated_at: now,
        }
    }
}

/// A variant of a product (e.g., size, color) with stock and reservation tracking.
#[derive(Debug, Clone, PartialEq)]
pub struct Variant {
    pub id: Uuid,
    pub product_id: Uuid,
    pub tenant_id: TenantId,
    pub sku: String,
    pub price: i64, // in cents
    pub stock_quantity: i64,
    pub reserved_quantity: i64,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

impl Variant {
    pub fn new(
        id: Uuid,
        tenant_id: TenantId,
        product_id: Uuid,
        sku: String,
        price: i64,
        clock: &dyn Clock,
    ) -> Self {
        let now = clock.now();
        Self {
            id,
            product_id,
            tenant_id,
            sku,
            price,
            stock_quantity: 0,
            reserved_quantity: 0,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn available(&self) -> i64 {
        self.stock_quantity - self.reserved_quantity
    }

    pub fn adjust_stock(&self, delta: i64, clock: &dyn Clock) -> Result<Self, StockError> {
        let new_stock = self.stock_quantity + delta;
        if new_stock < 0 {
            return Err(StockError::InsufficientStock {
                variant_id: self.id,
                available: self.available(),
                requested: -delta,
            });
        }
        let mut new = self.clone();
        new.stock_quantity = new_stock;
        new.updated_at = clock.now();
        Ok(new)
    }
}

#[derive(Debug, Clone, PartialEq, Error)]
pub enum StockError {
    #[error(
        "Insufficient stock for variant {variant_id}: available {available}, requested {requested}"
    )]
    InsufficientStock {
        variant_id: Uuid,
        available: i64,
        requested: i64,
    },
    #[error("Invalid quantity {quantity} for variant {variant_id}")]
    InvalidQuantity { variant_id: Uuid, quantity: i64 },
    #[error(
        "Reservation not found for variant {variant_id}: reserved {reserved}, requested {requested}"
    )]
    ReservationNotFound {
        variant_id: Uuid,
        reserved: i64,
        requested: i64,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct Warehouse {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub location: Option<String>,
    pub created_at: SystemTime,
}
