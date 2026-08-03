//! Inventory domain: Products and Variants.

use std::time::SystemTime;
use ataqu_kernel::Clock;

/// A product in the inventory.
#[derive(Debug, Clone, PartialEq)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

impl Product {
    pub fn new(id: String, name: String, description: String, clock: &impl Clock) -> Self {
        let now = clock.now();
        Self {
            id,
            name,
            description,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update_name(&mut self, new_name: String, clock: &impl Clock) {
        self.name = new_name;
        self.updated_at = clock.now();
    }

    pub fn update_description(&mut self, new_description: String, clock: &impl Clock) {
        self.description = new_description;
        self.updated_at = clock.now();
    }
}

/// A variant of a product (e.g., size, color) with stock and reservation tracking.
#[derive(Debug, Clone, PartialEq)]
pub struct Variant {
    pub id: String,
    pub product_id: String,
    pub sku: String,
    pub price: i64, // in cents
    pub stock_quantity: i64,
    pub reserved_quantity: i64,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

impl Variant {
    pub fn new(id: String, product_id: String, sku: String, price: i64, clock: &impl Clock) -> Self {
        let now = clock.now();
        Self {
            id,
            product_id,
            sku,
            price,
            stock_quantity: 0,
            reserved_quantity: 0,
            created_at: now,
            updated_at: now,
        }
    }

    /// Returns the currently available (unreserved) quantity.
    pub fn available(&self) -> i64 {
        self.stock_quantity - self.reserved_quantity
    }

    /// Adjusts stock by a delta (positive = inbound, negative = outbound).
    /// Returns an updated Variant if the result would not be negative.
    pub fn adjust_stock(&self, delta: i64, clock: &impl Clock) -> Result<Self, StockError> {
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

    /// Reserves a quantity of stock (reduces available, increases reserved).
    pub fn reserve(&self, quantity: i64, clock: &impl Clock) -> Result<Self, StockError> {
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

    /// Confirms a reservation (converts reserved to actual stock reduction).
    pub fn confirm_reservation(&self, quantity: i64, clock: &impl Clock) -> Result<Self, StockError> {
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
        // stock_quantity remains unchanged
        new.updated_at = clock.now();
        Ok(new)
    }

    /// Cancels a reservation (releases reserved quantity back to available).
    pub fn cancel_reservation(&self, quantity: i64, clock: &impl Clock) -> Result<Self, StockError> {
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

/// Errors that can occur during stock operations.
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

/// Repository trait for inventory persistence.
/// Domain trait is synchronous; infrastructure implementations will be async.
pub trait InventoryRepository {
    fn get_product(&self, product_id: &str) -> Option<Product>;
    fn get_variant(&self, variant_id: &str) -> Option<Variant>;
    fn save_product(&self, product: &Product) -> Result<(), RepositoryError>;
    fn save_variant(&self, variant: &Variant) -> Result<(), RepositoryError>;
}

/// Repository errors (infrastructure will map to concrete errors).
#[derive(Debug, Clone, PartialEq)]
pub enum RepositoryError {
    NotFound,
    Duplicate,
    DatabaseError(String),
    Other(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_kernel::Clock;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct MockClock;
    impl Clock for MockClock {
        fn now(&self) -> SystemTime {
            UNIX_EPOCH + std::time::Duration::from_secs(1000)
        }
    }

    fn make_variant() -> Variant {
        let clock = MockClock;
        Variant::new(
            "v1".to_string(),
            "p1".to_string(),
            "SKU123".to_string(),
            1000,
            &clock,
        )
    }

    #[test]
    fn variant_initial_state() {
        let v = make_variant();
        assert_eq!(v.stock_quantity, 0);
        assert_eq!(v.reserved_quantity, 0);
        assert_eq!(v.available(), 0);
    }

    #[test]
    fn adjust_stock_positive() {
        let clock = MockClock;
        let v = make_variant();
        let v2 = v.adjust_stock(10, &clock).unwrap();
        assert_eq!(v2.stock_quantity, 10);
        assert_eq!(v2.reserved_quantity, 0);
        assert_eq!(v2.available(), 10);
    }

    #[test]
    fn adjust_stock_negative_within_bounds() {
        let clock = MockClock;
        let v = make_variant().adjust_stock(10, &clock).unwrap();
        let v2 = v.adjust_stock(-5, &clock).unwrap();
        assert_eq!(v2.stock_quantity, 5);
        assert_eq!(v2.available(), 5);
    }

    #[test]
    fn adjust_stock_negative_below_zero() {
        let clock = MockClock;
        let v = make_variant().adjust_stock(5, &clock).unwrap();
        let err = v.adjust_stock(-10, &clock).unwrap_err();
        match err {
            StockError::InsufficientStock {
                variant_id,
                available,
                requested,
            } => {
                assert_eq!(variant_id, "v1");
                assert_eq!(available, 5);
                assert_eq!(requested, 10);
            }
            _ => panic!("unexpected error"),
        }
    }

    #[test]
    fn reserve_stock() {
        let clock = MockClock;
        let v = make_variant().adjust_stock(10, &clock).unwrap();
        let v2 = v.reserve(3, &clock).unwrap();
        assert_eq!(v2.stock_quantity, 10);
        assert_eq!(v2.reserved_quantity, 3);
        assert_eq!(v2.available(), 7);
    }

    #[test]
    fn reserve_stock_insufficient() {
        let clock = MockClock;
        let v = make_variant().adjust_stock(5, &clock).unwrap();
        let err = v.reserve(10, &clock).unwrap_err();
        match err {
            StockError::InsufficientStock {
                variant_id,
                available,
                requested,
            } => {
                assert_eq!(variant_id, "v1");
                assert_eq!(available, 5);
                assert_eq!(requested, 10);
            }
            _ => panic!("unexpected error"),
        }
    }

    #[test]
    fn reserve_zero_or_negative() {
        let clock = MockClock;
        let v = make_variant().adjust_stock(5, &clock).unwrap();
        let err = v.reserve(0, &clock).unwrap_err();
        match err {
            StockError::InvalidQuantity {
                variant_id,
                quantity,
            } => {
                assert_eq!(variant_id, "v1");
                assert_eq!(quantity, 0);
            }
            _ => panic!("unexpected error"),
        }
        let err = v.reserve(-1, &clock).unwrap_err();
        match err {
            StockError::InvalidQuantity {
                variant_id,
                quantity,
            } => {
                assert_eq!(variant_id, "v1");
                assert_eq!(quantity, -1);
            }
            _ => panic!("unexpected error"),
        }
    }

    #[test]
    fn confirm_reservation() {
        let clock = MockClock;
        let v = make_variant().adjust_stock(10, &clock).unwrap();
        let v2 = v.reserve(3, &clock).unwrap();
        let v3 = v2.confirm_reservation(3, &clock).unwrap();
        assert_eq!(v3.stock_quantity, 10);
        assert_eq!(v3.reserved_quantity, 0);
        assert_eq!(v3.available(), 10);
    }

    #[test]
    fn confirm_reservation_exceeds_reserved() {
        let clock = MockClock;
        let v = make_variant().adjust_stock(10, &clock).unwrap();
        let v2 = v.reserve(3, &clock).unwrap();
        let err = v2.confirm_reservation(5, &clock).unwrap_err();
        match err {
            StockError::ReservationNotFound {
                variant_id,
                reserved,
                requested,
            } => {
                assert_eq!(variant_id, "v1");
                assert_eq!(reserved, 3);
                assert_eq!(requested, 5);
            }
            _ => panic!("unexpected error"),
        }
    }

    #[test]
    fn cancel_reservation() {
        let clock = MockClock;
        let v = make_variant().adjust_stock(10, &clock).unwrap();
        let v2 = v.reserve(3, &clock).unwrap();
        let v3 = v2.cancel_reservation(3, &clock).unwrap();
        assert_eq!(v3.stock_quantity, 10);
        assert_eq!(v3.reserved_quantity, 0);
        assert_eq!(v3.available(), 10);
    }
}
