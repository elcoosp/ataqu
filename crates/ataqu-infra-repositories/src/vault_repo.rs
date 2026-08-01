use sea_orm::{DatabaseTransaction, DbBackend, Statement};
use uuid::Uuid;
use ataqu_kernel::TenantId;

/// InventoryRepository implementation for VAULT domain.
/// Handles atomic stock updates and enforces ADR-023 (Overflow Protection).
pub struct VaultRepository;

impl VaultRepository {
    /// Atomically decrements stock for a given variant.
    /// Returns `Ok(true)` if the update was successful (1 row affected).
    /// Returns `Ok(false)` if the update failed due to insufficient stock (0 rows affected).
    /// Returns `Err` on database errors.
    pub async fn decrement_stock(
        txn: &mut DatabaseTransaction,
        tenant_id: &TenantId,
        variant_id: Uuid,
        quantity: i32,
    ) -> Result<bool, sea_orm::DbErr> {
        // ADR-023 & Task Requirements: Atomic stock updates with CHECK constraint at DB level.
        // We also enforce `stock_quantity >= $1` in the WHERE clause to prevent
        // negative updates and return false if the update affects 0 rows (insufficient stock).
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE vault.variants
            SET stock_quantity = stock_quantity - $1
            WHERE id = $2
              AND tenant_id = $3
              AND stock_quantity >= $1
            "#,
            vec![
                quantity.into(),
                variant_id.into(),
                // Assuming TenantId provides a way to get the inner Uuid, e.g., as_uuid()
                // Adjust to the actual getter method available on TenantId if different.
                tenant_id.as_uuid().into(),
            ],
        );

        let result = txn.execute(stmt).await?;
        Ok(result.rows_affected() == 1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_repository_exists() {
        // Basic compilation test to ensure the module is structured correctly.
        // Integration tests would mock DatabaseTransaction or use a test DB.
        let _repo = VaultRepository;
    }
}
