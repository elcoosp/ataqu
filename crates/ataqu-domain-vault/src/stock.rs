//! Stock movements and tracking.

use std::time::SystemTime;
// Re-export errors from inventory for convenience
pub use crate::inventory::StockError;

/// A record of a stock movement (inbound or outbound).
#[derive(Debug, Clone, PartialEq)]
pub struct StockMovement {
    pub id: String,
    pub variant_id: String,
    pub quantity: i64, // positive = inbound, negative = outbound
    pub reason: String,
    pub timestamp: SystemTime,
}

impl StockMovement {
    pub fn new(id: String, variant_id: String, quantity: i64, reason: String) -> Self {
        Self {
            id,
            variant_id,
            quantity,
            reason,
            timestamp: SystemTime::now(),
        }
    }
}

/// A reservation record (for auditing purposes).
#[derive(Debug, Clone, PartialEq)]
pub struct Reservation {
    pub id: String,
    pub variant_id: String,
    pub quantity: i64,
    pub status: ReservationStatus,
    pub expires_at: Option<SystemTime>,
    pub created_at: SystemTime,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ReservationStatus {
    Pending,
    Confirmed,
    Cancelled,
}

impl Reservation {
    pub fn new(
        id: String,
        variant_id: String,
        quantity: i64,
        expires_at: Option<SystemTime>,
    ) -> Self {
        Self {
            id,
            variant_id,
            quantity,
            status: ReservationStatus::Pending,
            expires_at,
            created_at: SystemTime::now(),
        }
    }

    pub fn confirm(&mut self) {
        self.status = ReservationStatus::Confirmed;
    }

    pub fn cancel(&mut self) {
        self.status = ReservationStatus::Cancelled;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stock_movement_creation() {
        let mov = StockMovement::new(
            "mov1".to_string(),
            "v1".to_string(),
            10,
            "initial stock".to_string(),
        );
        assert_eq!(mov.quantity, 10);
        assert_eq!(mov.reason, "initial stock");
    }

    #[test]
    fn reservation_lifecycle() {
        let mut res = Reservation::new("res1".to_string(), "v1".to_string(), 5, None);
        assert_eq!(res.status, ReservationStatus::Pending);
        res.confirm();
        assert_eq!(res.status, ReservationStatus::Confirmed);
        res.cancel();
        assert_eq!(res.status, ReservationStatus::Cancelled);
    }
}
