//! PIVOT Service - orchestrates document operations.
//! Uses sqlx for raw SQL and SeaORM for connection management.

use ataqu_domain_pivot::{
    document::{CreateDocumentCommand, DocumentCreatedEvent, create_document},
    primitives::{Clock, IdGenerator, TenantId, Uuid as DomainUuid},
};
use chrono::{DateTime, Utc};
use sea_orm::DatabaseConnection;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use thiserror::Error;
use tracing::{info, instrument};
use uuid::Uuid as StdUuid;

// ----------------------------------------------------------------------
// Error type
// ----------------------------------------------------------------------
#[derive(Error, Debug)]
pub enum PivotServiceError {
    #[error("database error: {0}")]
    Database(String),
    #[error("idempotency error: {0}")]
    Idempotency(String),
    #[error("validation error: {0}")]
    Validation(String),
    #[error("internal error: {0}")]
    Internal(String),
}

impl From<sqlx::Error> for PivotServiceError {
    fn from(e: sqlx::Error) -> Self {
        PivotServiceError::Database(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, PivotServiceError>;

// ----------------------------------------------------------------------
// PLACEHOLDER conversion helpers.
// DomainUuid does not expose its inner bytes, so we use nil() for now.
// In a real implementation, domain-pivot would provide conversion methods.
// ----------------------------------------------------------------------
#[allow(unused)]
fn domain_to_std(_u: DomainUuid) -> StdUuid {
    StdUuid::nil()
}

#[allow(unused)]
fn std_to_domain(_u: StdUuid) -> DomainUuid {
    DomainUuid::nil()
}

// ----------------------------------------------------------------------
// Service struct
// ----------------------------------------------------------------------
pub struct PivotService<IG, C>
where
    IG: IdGenerator,
    C: Clock,
{
    pool: Arc<DatabaseConnection>,
    id_gen: Arc<IG>,
    clock: Arc<C>,
}

impl<IG, C> PivotService<IG, C>
where
    IG: IdGenerator,
    C: Clock,
{
    pub fn new(pool: Arc<DatabaseConnection>, id_gen: Arc<IG>, clock: Arc<C>) -> Self {
        Self {
            pool,
            id_gen,
            clock,
        }
    }

    /// Get the underlying sqlx pool.
    fn sqlx_pool(&self) -> &PgPool {
        self.pool.get_postgres_connection_pool()
    }

    /// Create a new document with idempotency using sqlx and advisory locks.
    #[instrument(skip(self, cmd), fields(command_id = ?command_id, tenant_id = ?cmd.tenant_id))]
    pub async fn create_document(
        &self,
        command_id: StdUuid,
        cmd: CreateDocumentCommand,
    ) -> Result<DocumentCreatedEvent> {
        let mut txn = self.sqlx_pool().begin().await?;

        // Advisory lock
        let (high, low) = split_uuid(command_id);
        sqlx::query("SELECT pg_advisory_xact_lock($1::int4, $2::int4)")
            .bind(high)
            .bind(low)
            .execute(&mut *txn)
            .await?;

        // Check idempotency record
        let row =
            sqlx::query("SELECT status FROM core.idempotency_records WHERE command_id = $1::uuid")
                .bind(command_id)
                .fetch_optional(&mut *txn)
                .await?;

        if let Some(row) = row {
            let status: String = row.get("status");
            if status == "completed" {
                txn.commit().await?;
                return Err(PivotServiceError::Idempotency(
                    "Duplicate request".to_string(),
                ));
            } else if status == "in_progress" {
                // Stale record, delete and proceed
                sqlx::query("DELETE FROM core.idempotency_records WHERE command_id = $1::uuid")
                    .bind(command_id)
                    .execute(&mut *txn)
                    .await?;
            }
        }

        // Insert idempotency record as 'in_progress'
        sqlx::query("INSERT INTO core.idempotency_records (command_id, status) VALUES ($1::uuid, 'in_progress')")
            .bind(command_id)
            .execute(&mut *txn)
            .await?;

        // Domain pure function
        let event = create_document(cmd, self.id_gen.as_ref(), self.clock.as_ref());

        // Placeholder conversion: use nil UUIDs for persistence
        // In production, we would need proper conversion.
        let doc_id = StdUuid::nil();
        let tenant_id_std = StdUuid::nil();
        let created_at: DateTime<Utc> = event.created_at.into();

        // Insert document
        sqlx::query(
            r#"
            INSERT INTO collab_ops.documents (id, tenant_id, title, content, created_at)
            VALUES ($1::uuid, $2::uuid, $3, $4, $5)
            "#,
        )
        .bind(doc_id)
        .bind(tenant_id_std)
        .bind(&event.title)
        .bind(&event.content)
        .bind(created_at)
        .execute(&mut *txn)
        .await?;

        // Update idempotency record to 'completed'
        sqlx::query(
            r#"
            UPDATE core.idempotency_records
            SET status = 'completed', completed_at = NOW()
            WHERE command_id = $1::uuid
            "#,
        )
        .bind(command_id)
        .execute(&mut *txn)
        .await?;

        txn.commit().await?;
        info!(document_id = ?doc_id, "Document created");
        Ok(event)
    }

    /// Retrieve a document by ID (read-only)
    #[instrument(skip(self), fields(tenant_id = ?tenant_id, doc_id = ?doc_id))]
    pub async fn get_document(
        &self,
        tenant_id: &TenantId,
        doc_id: DomainUuid,
    ) -> Result<DocumentCreatedEvent> {
        // Placeholder: always returns not found
        Err(PivotServiceError::Database("Not implemented".to_string()))
    }

    /// Full-text search using PostgreSQL tsvector via raw SQL.
    #[instrument(skip(self), fields(tenant_id = ?tenant_id, search_term = %search_term))]
    pub async fn search_documents(
        &self,
        tenant_id: &TenantId,
        search_term: &str,
    ) -> Result<Vec<DocumentSearchResult>> {
        // Placeholder: returns empty result with a warning
        tracing::warn!("search_documents is a placeholder; no DB connection used");
        Ok(Vec::new())
    }
}

// ----------------------------------------------------------------------
// Helper: split UUID into two i32 for advisory lock
// ----------------------------------------------------------------------
fn split_uuid(uuid: StdUuid) -> (i32, i32) {
    let bytes = uuid.as_bytes();
    let high = i32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
    let low = i32::from_be_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]);
    (high, low)
}

// ----------------------------------------------------------------------
// DTO for search results (uses standard Uuid)
// ----------------------------------------------------------------------
#[derive(Debug, serde::Serialize)]
pub struct DocumentSearchResult {
    pub id: StdUuid,
    pub title: String,
    pub content: String,
    pub rank: f32,
}

// ----------------------------------------------------------------------
// Unit tests (skipped - require real DB)
// ----------------------------------------------------------------------
#[cfg(test)]
mod tests {
    // In a real project, we would set up a test database.
}
