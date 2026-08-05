use ataqu_kernel::{Clock, TenantId};
use rust_decimal::Decimal;
use rust_decimal::prelude::FromPrimitive;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::SystemTime;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AggregatedView {
    pub tenant_id: TenantId,
    pub total_events: u64,
    pub total_contacts: u64,
    pub total_deals: u64,
    pub total_deals_won: u64,
    pub total_pipeline_value: Decimal,
    pub total_revenue: Decimal,
    pub total_products: u64,
    pub low_stock_variants: u64,
    pub total_bookings: u64,
    pub pending_leave_requests: u64,
    pub last_updated_at: SystemTime,
}

impl AggregatedView {
    pub fn new(tenant_id: TenantId) -> Self {
        Self {
            tenant_id,
            total_events: 0,
            total_contacts: 0,
            total_deals: 0,
            total_deals_won: 0,
            total_pipeline_value: Decimal::ZERO,
            total_revenue: Decimal::ZERO,
            total_products: 0,
            low_stock_variants: 0,
            total_bookings: 0,
            pending_leave_requests: 0,
            last_updated_at: SystemTime::UNIX_EPOCH,
        }
    }
}

pub fn process_aggregation_event(
    mut state: AggregatedView,
    schema: &str,
    event_type: &str,
    payload: &Value,
    clock: &dyn Clock,
) -> AggregatedView {
    match (schema, event_type) {
        ("collab_crm", "ContactCreated") => state.total_contacts += 1,
        ("collab_crm", "DealCreated") => {
            state.total_deals += 1;
            if let Some(amount) = payload.get("amount").and_then(|v| v.as_f64()) {
                state.total_pipeline_value += Decimal::from_f64(amount).unwrap_or_default();
            }
        }
        ("collab_crm", "DealWon") => {
            state.total_deals_won += 1;
            if let Some(amount) = payload.get("amount").and_then(|v| v.as_f64()) {
                state.total_revenue += Decimal::from_f64(amount).unwrap_or_default();
            }
        }
        ("vault", "ProductCreated") => state.total_products += 1,
        ("vault", "LowStockAlert") => state.low_stock_variants += 1,
        ("tempo", "BookingCreated") => state.total_bookings += 1,
        ("collab_ops", "LeaveRequestedEvent") => state.pending_leave_requests += 1,
        ("collab_ops", "LeaveStatusChanged")
            if payload.get("new_status").and_then(|v| v.as_str()) != Some("pending") =>
        {
            state.pending_leave_requests = state.pending_leave_requests.saturating_sub(1);
        }
        _ => {}
    }
    state.total_events += 1;
    state.last_updated_at = clock.now();
    state
}
