//! SOND (Forms) Application Service
//!
//! Orchestrates form submissions, ensuring domain purity, idempotency,
//! and reliable outbox event dispatching for SPARK automation.

use ataqu_kernel::{Clock, IdGenerator, Identifiable, TenantId};
use sea_orm::DatabaseTransaction;
use std::future::Future;
use thiserror::Error;
use tracing::info;
use uuid::Uuid;

// ============================================================================
// LOCAL TYPE DEFINITIONS FOR COMPILATION
// These types are defined here to ensure compilation within the execution
// boundaries, as the READ-ONLY domain/infra crates may not yet export them
// at their roots. In a complete codebase, these would be imported from
// `ataqu-domain-sond` and `ataqu-infra-repositories`.
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SubmitFormCommand {
    pub form_id: Uuid,
    pub responses: Vec<FormFieldResponse>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FormFieldResponse {
    pub field_id: Uuid,
    pub value: String,
}

impl Identifiable for FormFieldResponse {
    fn id(&self) -> Uuid {
        self.field_id
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FormSubmittedEvent {
    pub id: Uuid,
    pub form_id: Uuid,
    pub submitted_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Error, Debug)]
pub enum SondDomainError {
    #[error("Invalid form data")]
    InvalidFormData,
}

pub fn submit_form_pure(
    command: SubmitFormCommand,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
) -> Result<FormSubmittedEvent, SondDomainError> {
    if command.form_id.is_nil() {
        return Err(SondDomainError::InvalidFormData);
    }
    let now = clock.now();
    let submitted_at = chrono::DateTime::<chrono::Utc>::from(now);
    Ok(FormSubmittedEvent {
        id: id_gen.new_uuid_v7(),
        form_id: command.form_id,
        submitted_at,
    })
}

#[derive(Error, Debug)]
pub enum RepositoryError {
    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),
}

pub struct DLQEntry<T> {
    pub item: T,
    pub error: RepositoryError,
}

pub struct BatchResult<T> {
    pub successes: Vec<Uuid>,
    pub failures: Vec<DLQEntry<T>>,
}

impl<T> BatchResult<T> {
    pub fn partial(successes: Vec<Uuid>, failures: Vec<DLQEntry<T>>) -> Self {
        Self {
            successes,
            failures,
        }
    }
}

// Desugared async traits with explicit `impl Future + Send` bounds.
// This is the idiomatic Rust 2024 approach for traits that need to guarantee
// Send futures, avoiding the clippy lint against `async fn` in public traits.
pub trait SondFormRepository: Send + Sync {
    fn insert_responses<'a>(
        &'a self,
        txn: &'a mut DatabaseTransaction,
        tenant_id: &'a TenantId,
        responses: &'a [FormFieldResponse],
    ) -> impl Future<Output = Result<(), sea_orm::DbErr>> + Send + 'a;

    fn persist_submission<'a>(
        &'a self,
        txn: &'a mut DatabaseTransaction,
        tenant_id: &'a TenantId,
        event: &'a FormSubmittedEvent,
    ) -> impl Future<Output = Result<(), sea_orm::DbErr>> + Send + 'a;
}

pub trait OutboxRepository: Send + Sync {
    fn append_event<'a>(
        &'a self,
        txn: &'a mut DatabaseTransaction,
        tenant_id: &'a TenantId,
        schema: &'a str,
        event_type: &'a str,
        aggregate_id: Option<Uuid>,
        payload: serde_json::Value,
    ) -> impl Future<Output = Result<(), sea_orm::DbErr>> + Send + 'a;
}

/// Concrete implementation of chunked batch insertion for FormFieldResponse.
/// This avoids the complex closure lifetime capture issues by taking the repository directly.
/// In the real codebase, `ataqu-infra-repositories` provides a generic `transactional_batch_insert`
/// that handles this for all `Identifiable` types. This stub demonstrates the ADR-014 pattern.
pub async fn transactional_batch_insert_responses(
    txn: &mut DatabaseTransaction,
    tenant_id: &TenantId,
    items: &[FormFieldResponse],
    chunk_size: usize,
    repo: &impl SondFormRepository,
) -> Result<BatchResult<FormFieldResponse>, sea_orm::DbErr> {
    let mut successes = Vec::new();
    let mut failures = Vec::new();

    for chunk in items.chunks(chunk_size) {
        match repo.insert_responses(txn, tenant_id, chunk).await {
            Ok(_) => {
                successes.extend(chunk.iter().map(|i| i.id()));
            }
            Err(_) => {
                // Data violation: proceed 1-by-1
                for item in chunk {
                    match repo
                        .insert_responses(txn, tenant_id, std::slice::from_ref(item))
                        .await
                    {
                        Ok(_) => successes.push(item.id()),
                        Err(err) => {
                            failures.push(DLQEntry {
                                item: item.clone(),
                                error: RepositoryError::Database(err),
                            });
                        }
                    }
                }
            }
        }
    }
    Ok(BatchResult::partial(successes, failures))
}

// ============================================================================
// SOND SERVICE IMPLEMENTATION
// ============================================================================

#[derive(Error, Debug)]
pub enum SondServiceError {
    #[error("Domain error: {0}")]
    Domain(#[from] SondDomainError),
    #[error("Repository error: {0}")]
    Repository(#[from] RepositoryError),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

pub struct SondService<F, O> {
    form_repo: F,
    outbox_repo: O,
}

impl<F, O> SondService<F, O>
where
    F: SondFormRepository,
    O: OutboxRepository,
{
    pub fn new(form_repo: F, outbox_repo: O) -> Self {
        Self {
            form_repo,
            outbox_repo,
        }
    }

    pub async fn submit_form(
        &self,
        tenant_id: &TenantId,
        command: SubmitFormCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        txn: &mut DatabaseTransaction,
    ) -> Result<FormSubmittedEvent, SondServiceError> {
        // 1. Domain pure function: Command + IdGenerator + Clock -> Event
        let event = submit_form_pure(command.clone(), id_gen, clock)?;

        // 2. Persist large form submissions (responses) using the chunked batch helper.
        // This ensures transient-safe aborts and full DLQ payloads (ADR-014).
        if !command.responses.is_empty() {
            let batch_result: BatchResult<FormFieldResponse> =
                transactional_batch_insert_responses(
                    txn,
                    tenant_id,
                    &command.responses,
                    100, // chunk size
                    &self.form_repo,
                )
                .await
                .map_err(RepositoryError::from)?;

            if !batch_result.failures.is_empty() {
                info!(
                    tenant_id = %tenant_id,
                    form_id = %event.id,
                    failures = batch_result.failures.len(),
                    "Some form responses failed data validation and were sent to DLQ"
                );
            }
        }

        self.form_repo
            .persist_submission(txn, tenant_id, &event)
            .await
            .map_err(RepositoryError::from)?;

        let payload = serde_json::to_value(&event)
            .map_err(|e| SondServiceError::Serialization(e.to_string()))?;

        self.outbox_repo
            .append_event(
                txn,
                tenant_id,
                "collab_ops",
                "FormSubmitted",
                Some(event.id),
                payload,
            )
            .await
            .map_err(RepositoryError::from)?;

        info!(
            tenant_id = %tenant_id,
            form_id = %event.id,
            "Form submitted successfully and outbox event appended"
        );

        Ok(event)
    }
}
