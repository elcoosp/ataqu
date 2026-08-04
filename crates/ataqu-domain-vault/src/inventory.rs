//! Inventory domain: Products and Variants.
use std::time::SystemTime;
use ataqu_kernel::{Clock, TenantId};

/// A product in the inventory.
#[derive(Debug, Clone, PartialEq)]
pub struct Product {
    pub id: String,
    pub tenant_id: TenantId,
    pub name: String,
    pub description: String,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

impl Product {
    pub fn new(id: String, tenant_id: TenantId, name: String, description: String, clock: &dyn Clock) -> Self {
        let now = clock.now();
        Self {
            id,
            tenant_id,
            name,
            description,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update_name(&mut self, new_name: String, clock: &dyn Clock) {
        self.name = new_name;
        self.updated_at = clock.now();
    }

    pub fn update_description(&mut self, new_description: String, clock: &dyn Clock) {
        self.description = new_description;
        self.updated_at = clock.now();
    }
}

/// A variant of a product (e.g., size, color) with stock and reservation tracking.
#[derive(Debug, Clone, PartialEq)]
pub struct Variant {
    pub id: String,
    pub product_id: String,
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
        id: String,
        tenant_id: TenantId,
        product_id: String,
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
                variant_id: self.id.clone(),
                available: self.available(),
                requested: -delta,
            });
        }
        let mut new = self.clone();
        new.stock_quantity = new_stock;
        new.updated_at = clock.now();
        Ok(new)
    }

    pub fn reserve(&self, quantity: i64, clock: &dyn Clock) -> Result<Self, StockError> {
        if quantity <= 0 {
            return Err(StockError::InvalidQuantity {
                variant_id: self.id.clone(),
                quantity,
            });
        }
        let available = self.available();
        if available < quantity {
            return Err(StockError::InsufficientStock {
                variant_id: self.id.clone(),
                available,
                requested: quantity,
            });
        }
        let mut new = self.clone();
        new.reserved_quantity += quantity;
        new.updated_at = clock.now();
        Ok(new)
    }

    pub fn confirm_reservation(&self, quantity: i64, clock: &dyn Clock) -> Result<Self, StockError> {
        if quantity <= 0 {
            return Err(StockError::InvalidQuantity {
                variant_id: self.id.clone(),
                quantity,
            });
        }
        if self.reserved_quantity < quantity {
            return Err(StockError::ReservationNotFound {
                variant_id: self.id.clone(),
                reserved: self.reserved_quantity,
                requested: quantity,
            });
        }
        let mut new = self.clone();
        new.reserved_quantity -= quantity;
        new.updated_at = clock.now();
        Ok(new)
    }

    pub fn cancel_reservation(&self, quantity: i64, clock: &dyn Clock) -> Result<Self, StockError> {
        if quantity <= 0 {
            return Err(StockError::InvalidQuantity {
                variant_id: self.id.clone(),
                quantity,
            });
        }
        if self.reserved_quantity < quantity {
            return Err(StockError::ReservationNotFound {
                variant_id: self.id.clone(),
                reserved: self.reserved_quantity,
                requested: quantity,
            });
        }
        let mut new = self.clone();
        new.reserved_quantity -= quantity;
        new.updated_at = clock.now();
        Ok(new)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum StockError {
    InsufficientStock {
        variant_id: String,
        available: i64,
        requested: i64,
    },
    InvalidQuantity {
        variant_id: String,
        quantity: i64,
    },
    ReservationNotFound {
        variant_id: String,
        reserved: i64,
        requested: i64,
    },
}

pub trait InventoryRepository {
    fn get_product(&self, product_id: &str) -> Option<Product>;
    fn get_variant(&self, variant_id: &str) -> Option<Variant>;
    fn save_product(&self, product: &Product) -> Result<(), RepositoryError>;
    fn save_variant(&self, variant: &Variant) -> Result<(), RepositoryError>;
}

#[derive(Debug, Clone, PartialEq)]
pub enum RepositoryError {
    NotFound,
    Duplicate,
    DatabaseError(String),
    Other(String),
}
