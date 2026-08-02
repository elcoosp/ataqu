use ataqu_domain_vault::{LowStockAlertEvent, StockUpdatedEvent, UpdateStockCommand};
use ataqu_infra_repositories::{OutboxRepository, RepositoryError, VaultRepository};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use sea_orm::DatabaseTransaction;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VaultServiceError {
    #[error("Insufficient stock for item")]
    InsufficientStock,
    #[error("Repository error: {0}")]
    Repository(#[from] RepositoryError),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

pub struct VaultService;

impl VaultService {
    pub fn new() -> Self {
        Self
    }

    /// Orchestrates atomic stock updates following strict idempotency flow (ADR-017).
    ///
    /// 1. Calls domain pure function to validate and produce events.
    /// 2. Delegates atomic stock update to repository (UPDATE ... WHERE stock >= quantity).
    /// 3. Emits low-stock alert to unified outbox if threshold is met.
    ///
    /// All operations occur within the provided `DatabaseTransaction`, guaranteeing atomicity.
    pub async fn update_stock(
        &self,
        tenant_id: &TenantId,
        command: UpdateStockCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        vault_repo: &impl VaultRepository,
        outbox_repo: &impl OutboxRepository,
        txn: &mut DatabaseTransaction,
    ) -> Result<StockUpdatedEvent, VaultServiceError> {
        // 1. Domain pure logic: validate and create event
        let event = ataqu_domain_vault::update_stock(command, id_gen, clock);

        // 2. Execute atomic stock update via repository
        // Repository handles: UPDATE ... SET stock = stock - {quantity} WHERE stock >= {quantity} AND id = {item_id}
        let updated = vault_repo
            .update_stock_atomic(txn, tenant_id, event.item_id, event.quantity_delta)
            .await
            .map_err(VaultServiceError::Repository)?;

        if !updated {
            return Err(VaultServiceError::InsufficientStock);
        }

        // 3. Emit low-stock alert via outbox if threshold is met
        if event.current_stock <= event.low_stock_threshold {
            let alert_event = LowStockAlertEvent {
                id: id_gen.new_uuid_v7(),
                item_id: event.item_id,
                current_stock: event.current_stock,
                threshold: event.low_stock_threshold,
                created_at: clock.now(),
            };

            let payload = serde_json::to_value(&alert_event)
                .map_err(|e| VaultServiceError::Serialization(e.to_string()))?;

            outbox_repo
                .append(
                    txn,
                    tenant_id,
                    "vault",
                    "low_stock_alert",
                    event.item_id,
                    payload,
                )
                .await
                .map_err(VaultServiceError::Repository)?;
        }

        Ok(event)
    }
}
