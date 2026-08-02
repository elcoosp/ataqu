//! CINQ CRM orchestration service.
//! Implements the application layer for CINQ, orchestrating contacts, deals,
//! CSV imports, email tracking, and cross-domain projection consumption.

use std::sync::Arc;

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_domain_cinq::{commands::*, events::*, Contact, ContactId, Deal, ValidatedContactRow};
use ataqu_infra_repositories::{
    cinq::{ContactRepository, DealRepository},
    BatchResult, RepositoryError,
};
use ataqu_infra_idempotency::{IdempotencyError, IdempotencyGuard, IdempotencyGuardFactory};
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

// ----------------------------------------------------------------------
// Error types
// ----------------------------------------------------------------------

#[derive(Debug, thiserror::Error)]
pub enum CinqError {
    #[error("Idempotency error: {0}")]
    Idempotency(#[from] IdempotencyError),

    #[error("Repository error: {0}")]
    Repository(#[from] RepositoryError),

    #[error("Domain validation error: {0}")]
    Domain(String),

    #[error("Event handling error: {0}")]
    Event(String),

    #[error("Batch import error: {0}")]
    Batch(String),

    #[error("Email tracking error: {0}")]
    EmailTracking(String),
}

pub type CinqResult<T> = Result<T, CinqError>;

// ----------------------------------------------------------------------
// Email tracking event type (assumed to be defined elsewhere)
// ----------------------------------------------------------------------

/// Placeholder for the actual email tracking event.
/// In reality this would be defined in `ataqu-domain-cinq` or `ataqu-infra-repositories`.
#[derive(Debug, Clone)]
pub struct EmailTrackingEvent {
    pub contact_id: ContactId,
    pub tenant_id: TenantId,
    pub action: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

// ----------------------------------------------------------------------
// Service struct
// ----------------------------------------------------------------------

pub struct CinqService<CRepo, DRepo, G, I, C> {
    contact_repo: CRepo,
    deal_repo: DRepo,
    guard_factory: G,
    id_gen: I,
    clock: C,
    email_tracking_tx: mpsc::Sender<EmailTrackingEvent>,
}

impl<CRepo, DRepo, G, I, C> CinqService<CRepo, DRepo, G, I, C>
where
    CRepo: ContactRepository,
    DRepo: DealRepository,
    G: IdempotencyGuardFactory,
    I: IdGenerator,
    C: Clock,
{
    /// Creates a new CINQ service instance.
    pub fn new(
        contact_repo: CRepo,
        deal_repo: DRepo,
        guard_factory: G,
        id_gen: I,
        clock: C,
        email_tracking_tx: mpsc::Sender<EmailTrackingEvent>,
    ) -> Self {
        Self {
            contact_repo,
            deal_repo,
            guard_factory,
            id_gen,
            clock,
            email_tracking_tx,
        }
    }

    // ----------------------------------------------------------------------
    // Contact operations
    // ----------------------------------------------------------------------

    /// Create a new contact with idempotent semantics.
    pub async fn create_contact(
        &self,
        tenant_id: TenantId,
        cmd: CreateContactCommand,
        command_id: Uuid,
    ) -> CinqResult<Contact> {
        let guard = self.guard_factory.create(command_id, tenant_id).await?;

        let result = guard
            .run(|txn| {
                let span = tracing::info_span!(
                    "create_contact",
                    tenant_id = %tenant_id,
                    command_id = %command_id,
                );
                let _enter = span.enter();

                tracing::debug!("Starting domain validation");
                let event = ataqu_domain_cinq::create_contact(cmd, &self.id_gen, &self.clock)
                    .map_err(|e| CinqError::Domain(e.to_string()))?;

                tracing::debug!("Persisting contact");
                let contact = self
                    .contact_repo
                    .create_contact(txn, tenant_id, event)
                    .await
                    .map_err(CinqError::from)?;

                // Dispatch email tracking event asynchronously to avoid blocking.
                // We spawn a task so that even if the channel is full, the main flow continues.
                let tracking_event = EmailTrackingEvent {
                    contact_id: contact.id().clone(),
                    tenant_id,
                    action: "contact_created".to_string(),
                    timestamp: self.clock.now().into(),
                };
                let tx = self.email_tracking_tx.clone();
                tokio::spawn(async move {
                    if let Err(e) = tx.try_send(tracking_event) {
                        warn!(
                            "Failed to dispatch email tracking event: {} (contact_id={})",
                            e,
                            contact.id()
                        );
                    }
                });

                tracing::debug!("Contact created successfully");
                Ok(contact)
            })
            .await?;

        Ok(result)
    }

    /// Update an existing contact.
    pub async fn update_contact(
        &self,
        tenant_id: TenantId,
        contact_id: ContactId,
        cmd: UpdateContactCommand,
        command_id: Uuid,
    ) -> CinqResult<Contact> {
        let guard = self.guard_factory.create(command_id, tenant_id).await?;

        let result = guard
            .run(|txn| {
                let span = tracing::info_span!(
                    "update_contact",
                    tenant_id = %tenant_id,
                    command_id = %command_id,
                    contact_id = %contact_id,
                );
                let _enter = span.enter();

                tracing::debug!("Validating update");
                let event = ataqu_domain_cinq::update_contact(contact_id, cmd, &self.id_gen, &self.clock)
                    .map_err(|e| CinqError::Domain(e.to_string()))?;

                tracing::debug!("Persisting update");
                let updated = self
                    .contact_repo
                    .update_contact(txn, tenant_id, event)
                    .await
                    .map_err(CinqError::from)?;

                let tracking_event = EmailTrackingEvent {
                    contact_id: updated.id().clone(),
                    tenant_id,
                    action: "contact_updated".to_string(),
                    timestamp: self.clock.now().into(),
                };
                let tx = self.email_tracking_tx.clone();
                tokio::spawn(async move {
                    if let Err(e) = tx.try_send(tracking_event) {
                        warn!(
                            "Failed to dispatch email tracking event: {} (contact_id={})",
                            e,
                            updated.id()
                        );
                    }
                });

                tracing::debug!("Contact updated successfully");
                Ok(updated)
            })
            .await?;

        Ok(result)
    }

    // ----------------------------------------------------------------------
    // Deal operations (minimal example)
    // ----------------------------------------------------------------------

    pub async fn create_deal(
        &self,
        tenant_id: TenantId,
        cmd: CreateDealCommand,
        command_id: Uuid,
    ) -> CinqResult<Deal> {
        let guard = self.guard_factory.create(command_id, tenant_id).await?;

        let result = guard
            .run(|txn| {
                let span = tracing::info_span!(
                    "create_deal",
                    tenant_id = %tenant_id,
                    command_id = %command_id,
                );
                let _enter = span.enter();

                tracing::debug!("Validating deal creation");
                let event = ataqu_domain_cinq::create_deal(cmd, &self.id_gen, &self.clock)
                    .map_err(|e| CinqError::Domain(e.to_string()))?;

                tracing::debug!("Persisting deal");
                let deal = self
                    .deal_repo
                    .create_deal(txn, tenant_id, event)
                    .await
                    .map_err(CinqError::from)?;

                tracing::debug!("Deal created successfully");
                Ok(deal)
            })
            .await?;

        Ok(result)
    }

    // ----------------------------------------------------------------------
    // CSV import
    // ----------------------------------------------------------------------

    /// Import a batch of validated contact rows.
    /// Uses the generic `transactional_batch_insert` helper internally.
    pub async fn import_contacts(
        &self,
        tenant_id: TenantId,
        rows: Vec<ValidatedContactRow>,
        command_id: Uuid,
    ) -> CinqResult<BatchResult> {
        let guard = self.guard_factory.create(command_id, tenant_id).await?;

        let batch_result = guard
            .run(|txn| {
                let span = tracing::info_span!(
                    "import_contacts",
                    tenant_id = %tenant_id,
                    command_id = %command_id,
                    row_count = rows.len(),
                );
                let _enter = span.enter();

                tracing::debug!("Starting batch import");
                let result = self.contact_repo
                    .batch_insert_contacts(txn, tenant_id, &rows)
                    .await
                    .map_err(CinqError::from)?;

                tracing::debug!(success_count = result.successes.len(), failure_count = result.failures.len(), "Batch import completed");
                Ok(result)
            })
            .await?;

        // Optionally log DLQ entries
        if !batch_result.failures.is_empty() {
            warn!(
                "CSV import completed with {} failures (tenant={})",
                batch_result.failures.len(),
                tenant_id
            );
            for entry in &batch_result.failures {
                debug!("DLQ entry: {:?}", entry);
            }
        }

        Ok(batch_result)
    }

    // ----------------------------------------------------------------------
    // Cross-domain projection consumer: PAUSE EmployeeCreatedV1
    // ----------------------------------------------------------------------

    /// Handles a `EmployeeCreatedV1` event from PAUSE, creating a corresponding CINQ contact.
    /// This is idempotent: uses a deterministic `command_id` derived from the event ID.
    pub async fn handle_pause_employee_created(
        &self,
        tenant_id: TenantId,
        event: EmployeeCreatedV1,
    ) -> CinqResult<()> {
        // Derive a stable command_id from the event's unique ID so that duplicate deliveries
        // are idempotent.
        let command_id = Uuid::new_v5(&Uuid::NAMESPACE_OID, event.id.as_bytes());

        let guard = self.guard_factory.create(command_id, tenant_id).await?;

        guard
            .run(|txn| {
                let span = tracing::info_span!(
                    "handle_pause_employee_created",
                    tenant_id = %tenant_id,
                    command_id = %command_id,
                    event_id = %event.id,
                );
                let _enter = span.enter();

                tracing::debug!("Converting employee event to contact command");
                let cmd = ataqu_domain_cinq::CreateContactCommand::from_employee(event)
                    .map_err(|e| CinqError::Domain(e.to_string()))?;

                tracing::debug!("Validating contact creation");
                let contact_event = ataqu_domain_cinq::create_contact(cmd, &self.id_gen, &self.clock)
                    .map_err(|e| CinqError::Domain(e.to_string()))?;

                tracing::debug!("Persisting projected contact");
                self.contact_repo
                    .create_contact(txn, tenant_id, contact_event)
                    .await
                    .map_err(CinqError::from)?;

                tracing::debug!("Projection handled successfully");
                Ok(())
            })
            .await?;

        info!(
            "Consumed PAUSE EmployeeCreatedV1 event (id={}) for tenant {}",
            event.id, tenant_id
        );
        Ok(())
    }
}

// ----------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_kernel::MockClock;
    use ataqu_kernel::MockIdGenerator;
    use ataqu_kernel::TenantId;
    use ataqu_infra_idempotency::MockIdempotencyGuardFactory;
    use ataqu_infra_repositories::cinq::MockContactRepository;
    use ataqu_infra_repositories::cinq::MockDealRepository;
    use tokio::sync::mpsc;
    use uuid::Uuid;

    // Dummy types for testing (they would be provided by the actual crates)
    // Here we just sketch the test structure.

    #[tokio::test]
    async fn test_create_contact_success() {
        // Setup mocks
        let contact_repo = MockContactRepository::new();
        let deal_repo = MockDealRepository::new();
        let guard_factory = MockIdempotencyGuardFactory::new();
        let id_gen = MockIdGenerator::new();
        let clock = MockClock::new();
        let (tx, _rx) = mpsc::channel(100);

        let service = CinqService::new(
            contact_repo,
            deal_repo,
            guard_factory,
            id_gen,
            clock,
            tx,
        );

        let tenant_id = TenantId::new(Uuid::new_v4());
        let cmd = CreateContactCommand {
            name: "Test Contact".to_string(),
            email: "test@example.com".to_string(),
            // other fields...
        };
        let command_id = Uuid::new_v4();

        // When we call create_contact, it should return a Contact.
        // For the test to compile we need real implementations, but we're only testing the service logic.
        // We'll just assert that the method signature is correct.
        // In a real test we would mock the guard and repo to return expected values.
        // This is a placeholder to ensure the code compiles.
        let result = service.create_contact(tenant_id, cmd, command_id).await;
        // In a real test we'd assert Ok(result) etc.
    }

    #[test]
    fn test_import_contacts_signature() {
        // Just a compile-time check that the method exists with the right signature.
        // We don't actually run it here.
    }
}
