//! Tempo application service orchestrating bookings, event types, and OAuth refresh.
//!
//! Follows ADR-017: Pure Domain Model with Application-Layer Orchestration.
//! Follows ADR-025: TEMPO OAuth Token Refresh Saga.
//! Follows ADR-032: No-Show Detection with Sargable Bounded Query (dispatches task).

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use sea_orm::DatabaseTransaction;
use thiserror::Error;
use tracing::{error, info};

#[derive(Debug, Error)]
pub enum TempoServiceError {
    #[error("Domain validation error: {0}")]
    Domain(String),
    #[error("Infrastructure error: {0}")]
    Infra(String),
}

/// Trait for appending events to the unified outbox within a transaction.
/// This avoids tight coupling to a specific outbox implementation in the application layer.
#[async_trait::async_trait]
pub trait OutboxAppender {
    async fn append(
        &self,
        tenant_id: &TenantId,
        schema: &str,
        event_type: &str,
        aggregate_id: Option<uuid::Uuid>,
        payload: &serde_json::Value,
        txn: &mut DatabaseTransaction,
    ) -> Result<(), TempoServiceError>;
}

/// Trait for Tempo booking operations.
#[async_trait::async_trait]
pub trait TempoBookingRepository {
    async fn create_booking(
        &self,
        tenant_id: &TenantId,
        event: &crate::tempo_service::BookingCreatedEvent, // Adjust based on actual domain type
        txn: &mut DatabaseTransaction,
    ) -> Result<(), TempoServiceError>;
}

/// Trait for Tempo event type operations.
#[async_trait::async_trait]
pub trait TempoEventTypeRepository {
    async fn create_event_type(
        &self,
        tenant_id: &TenantId,
        event: &crate::tempo_service::EventTypeCreatedEvent,
        txn: &mut DatabaseTransaction,
    ) -> Result<(), TempoServiceError>;
}

/// Trait for Tempo OAuth token operations.
#[async_trait::async_trait]
pub trait TempoOAuthTokenRepository {
    async fn update_oauth_token(
        &self,
        tenant_id: &TenantId,
        event: &crate::tempo_service::OAuthTokenRefreshedEvent,
        txn: &mut DatabaseTransaction,
    ) -> Result<(), TempoServiceError>;
}

// Placeholder domain event types to ensure compilation if contracts are missing.
// In a real scenario, these would be imported from `ataqu_contracts::tempo`.
#[derive(Debug, Clone, serde::Serialize)]
pub struct BookingCreatedEvent {
    pub id: uuid::Uuid,
    pub starts_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct EventTypeCreatedEvent {
    pub id: uuid::Uuid,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct OAuthTokenRefreshedEvent {
    pub id: uuid::Uuid,
}

pub struct TempoService<B, E, O, Outbox> {
    booking_repo: B,
    event_type_repo: E,
    oauth_token_repo: O,
    outbox: Outbox,
}

impl<B, E, O, Outbox> TempoService<B, E, O, Outbox>
where
    B: TempoBookingRepository,
    E: TempoEventTypeRepository,
    O: TempoOAuthTokenRepository,
    Outbox: OutboxAppender,
{
    pub fn new(booking_repo: B, event_type_repo: E, oauth_token_repo: O, outbox: Outbox) -> Self {
        Self {
            booking_repo,
            event_type_repo,
            oauth_token_repo,
            outbox,
        }
    }

    /// Creates an event type, persists it, and appends to the outbox.
    pub async fn create_event_type(
        &self,
        tenant_id: &TenantId,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        txn: &mut DatabaseTransaction,
    ) -> Result<EventTypeCreatedEvent, TempoServiceError> {
        info!(tenant_id = %tenant_id, "Creating event type");

        // In a real implementation, this calls the pure domain function:
        // let event = ataqu_domain_tempo::create_event_type(cmd, id_gen, clock)?;
        let event = EventTypeCreatedEvent {
            id: id_gen.new_uuid_v7(),
        };

        self.event_type_repo
            .create_event_type(tenant_id, &event, txn)
            .await?;

        self.outbox
            .append(
                tenant_id,
                "collab_ops",
                "EventTypeCreated",
                Some(event.id),
                &serde_json::to_value(&event)
                    .map_err(|e| TempoServiceError::Infra(e.to_string()))?,
                txn,
            )
            .await?;

        info!(tenant_id = %tenant_id, event_id = %event.id, "Event type created successfully");
        Ok(event)
    }

    /// Creates a booking, persists it, appends to outbox, and dispatches a no-show detection task.
    pub async fn create_booking(
        &self,
        tenant_id: &TenantId,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        txn: &mut DatabaseTransaction,
    ) -> Result<BookingCreatedEvent, TempoServiceError> {
        info!(tenant_id = %tenant_id, "Creating booking");

        // let event = ataqu_domain_tempo::create_booking(cmd, id_gen, clock)?;
        let event = BookingCreatedEvent {
            id: id_gen.new_uuid_v7(),
            starts_at: clock.now().into(),
        };

        self.booking_repo
            .create_booking(tenant_id, &event, txn)
            .await?;

        self.outbox
            .append(
                tenant_id,
                "collab_ops",
                "BookingCreated",
                Some(event.id),
                &serde_json::to_value(&event)
                    .map_err(|e| TempoServiceError::Infra(e.to_string()))?,
                txn,
            )
            .await?;

        // ADR-032: Dispatch no-show detection task to core.scheduled_tasks
        let no_show_payload = serde_json::json!({
            "booking_id": event.id,
            "scheduled_at": event.starts_at,
        });

        self.outbox
            .append(
                tenant_id,
                "core",
                "ScheduleNoShowCheck",
                Some(event.id),
                &no_show_payload,
                txn,
            )
            .await?;

        info!(tenant_id = %tenant_id, event_id = %event.id, "Booking created and no-show task dispatched");
        Ok(event)
    }

    /// ADR-025: TEMPO OAuth Token Refresh Saga
    pub async fn refresh_oauth_token_saga(
        &self,
        tenant_id: &TenantId,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        txn: &mut DatabaseTransaction,
    ) -> Result<OAuthTokenRefreshedEvent, TempoServiceError> {
        info!(tenant_id = %tenant_id, "Starting OAuth token refresh saga");

        // In a real implementation, this would involve an HTTP call to the OAuth provider
        // to exchange the refresh token for a new access token, orchestrated as a saga.
        let event = OAuthTokenRefreshedEvent {
            id: id_gen.new_uuid_v7(),
        };

        self.oauth_token_repo
            .update_oauth_token(tenant_id, &event, txn)
            .await?;

        self.outbox
            .append(
                tenant_id,
                "collab_ops",
                "OAuthTokenRefreshed",
                Some(event.id),
                &serde_json::to_value(&event)
                    .map_err(|e| TempoServiceError::Infra(e.to_string()))?,
                txn,
            )
            .await?;

        info!(tenant_id = %tenant_id, event_id = %event.id, "OAuth token refresh saga completed");
        Ok(event)
    }
}
