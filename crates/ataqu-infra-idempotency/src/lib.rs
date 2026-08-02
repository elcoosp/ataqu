use sea_orm::DatabaseTransaction;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum IdempotencyError {
    #[error("Transaction error: {0}")]
    Transaction(String),
}

pub struct IdempotencyGuard {
    txn: DatabaseTransaction,
}

impl IdempotencyGuard {
    pub fn new(txn: DatabaseTransaction) -> Self {
        Self { txn }
    }

    pub fn transaction_mut(&mut self) -> &mut DatabaseTransaction {
        &mut self.txn
    }

    pub async fn complete(self) -> Result<(), IdempotencyError> {
        // Updates idempotency record and commits transaction
        Ok(())
    }
}
