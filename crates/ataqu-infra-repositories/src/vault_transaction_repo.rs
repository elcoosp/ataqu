//! Transaction-aware repository extension for VAULT.
use async_trait::async_trait;
use ataqu_domain_vault::inventory::Variant;
use ataqu_domain_vault::stock::StockMovement;
use ataqu_kernel::RepositoryError;
use sea_orm::DatabaseTransaction;

#[async_trait]
pub trait VaultTransactionRepository: Send + Sync {
    async fn save_variant_txn(
        &self,
        txn: &mut DatabaseTransaction,
        variant: &Variant,
    ) -> Result<(), RepositoryError>;

    async fn save_movement_txn(
        &self,
        txn: &mut DatabaseTransaction,
        movement: &StockMovement,
    ) -> Result<(), RepositoryError>;
}
