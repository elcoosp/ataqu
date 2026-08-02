//! Tempo application service orchestrating bookings, event types, and OAuth refresh.
//!
//! Follows ADR-017: Pure Domain Model with Application-Layer Orchestration.
//! Follows ADR-025: TEMPO OAuth Token Refresh Saga.
//! Follows ADR-032: No-Show Detection with Sargable Bounded Query (dispatches task).

use ataqu_contracts::tempo::{
    BookingCreatedEvent, CreateBookingCommand, CreateEventTypeCommand, EventTypeCreatedEvent,
    OAuthTokenRefreshedEvent, RefreshOAuthTokenCommand,
};
use ataqu_domain_tempo::{create_booking, create_event_type, refresh_oauth_token};
use ataqu_infra_repositories::{
    OutboxAppender, TempoBookingRepository, TempoEventTypeRepository, TempoOAuthTokenRepository,
};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use sea_orm::DatabaseTransaction;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum TempoServiceError {
    #[error("Domain validation error: {0}")]
    Domain(String),
    #[error("Infrastructure error: {0}")]
    Infra(String),
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
        cmd: CreateEventTypeCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        txn: &mut DatabaseTransaction,
    ) -> Result<EventTypeCreatedEvent, TempoServiceError> {
        tracing::info!(tenant_id = %tenant_id, "Creating event type");

        let event = create_event_type(cmd, id_gen, clock)
            .map_err(|e| {
                tracing::error!(tenant_id = %tenant_id, error = %e, "Event type creation domain validation failed");
                TempoServiceError::Domain(e.to_string())
            })?;

        self.event_type_repo
            .create(tenant_id, &event, txn)
            .await
            .map_err(|e| {
                tracing::error!(tenant_id = %tenant_id, error = %e, "Event type persistence failed");
                TempoServiceError::Infra(e.to_string())
            })?;

        self.outbox
            .append(
                tenant_id,
                "collab_ops",
                "EventTypeCreated",
                Some(event.id),
                &serde_json::to_value(&event).map_err(|e| TempoServiceError::Infra(e.to_string()))?,
                txn,
            )
            .await
            .map_err(|e| {
                tracing::error!(tenant_id = %tenant_id, error = %e, "Outbox append failed for event type");
                TempoServiceError::Infra(e.to_string())
            })?;

        tracing::info!(tenant_id = %tenant_id, event_id = %event.id, "Event type created successfully");
        Ok(event)
    }

    /// Creates a booking, persists it, appends to outbox, and dispatches a no-show detection task.
    pub async fn create_booking(
        &self,
        tenant_id: &TenantId,
        cmd: CreateBookingCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        txn: &mut DatabaseTransaction,
    ) -> Result<BookingCreatedEvent, TempoServiceError> {
        tracing::info!(tenant_id = %tenant_id, "Creating booking");

        let event = create_booking(cmd, id_gen, clock)
            .map_err(|e| {
                tracing::error!(tenant_id = %tenant_id, error = %e, "Booking creation domain validation failed");
                TempoServiceError::Domain(e.to_string())
            })?;

        self.booking_repo
            .create(tenant_id, &event, txn)
            .await
            .map_err(|e| {
                tracing::error!(tenant_id = %tenant_id, error = %e, "Booking persistence failed");
                TempoServiceError::Infra(e.to_string())
            })?;

        self.outbox
            .append(
                tenant_id,
                "collab_ops",
                "BookingCreated",
                Some(event.id),
                &serde_json::to_value(&event).map_err(|e| TempoServiceError::Infra(e.to_string()))?,
                txn,
            )
            .await
            .map_err(|e| {
                tracing::error!(tenant_id = %tenant_id, error = %e, "Outbox append failed for booking");
                TempoServiceError::Infra(e.to_string())
            })?;

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
            .await
            .map_err(|e| {
                tracing::error!(tenant_id = %tenant_id, error = %e, "Outbox append failed for no-show check");
                TempoServiceError::Infra(e.to_string())
            })?;

        tracing::info!(tenant_id = %tenant_id, event_id = %event.id, "Booking created and no-show task dispatched");
        Ok(event)
    }

    /// ADR-025: TEMPO OAuth Token Refresh Saga
    /// Orchestrates the refresh of an OAuth token for a tenant.
    pub async fn refresh_oauth_token_saga(
        &self,
        tenant_id: &TenantId,
        cmd: RefreshOAuthTokenCommand,
        id_gen: &impl IdGenerator,
        clock: &impl Clock,
        txn: &mut DatabaseTransaction,
    ) -> Result<OAuthTokenRefreshedEvent, TempoServiceError> {
        tracing::info!(tenant_id = %tenant_id, "Starting OAuth token refresh saga");

        // In a real implementation, this would involve an HTTP call to the OAuth provider
        // to exchange the refresh token for a new access token.
        let new_access_token = "mock_new_access_token".to_string();
        let new_refresh_token = "mock_new_refresh_token".to_string();
        let expires_at = clock.now();

        let event = refresh_oauth_token(
            cmd,
            new_access_token,
            new_refresh_token,
            expires_at,
            id_gen,
            clock,
        )
        .map_err(|e| {
            tracing::error!(tenant_id = %tenant_id, error = %e, "OAuth token refresh domain validation failed");
            TempoServiceError::Domain(e.to_string())
        })?;

        self.oauth_token_repo
            .update(tenant_id, &event, txn)
            .await
            .map_err(|e| {
                tracing::error!(tenant_id = %tenant_id, error = %e, "OAuth token refresh persistence failed");
                TempoServiceError::Infra(e.to_string())
            })?;

        self.outbox
            .append(
                tenant_id,
                "collab_ops",
                "OAuthTokenRefreshed",
                Some(event.id),
                &serde_json::to_value(&event).map_err(|e| TempoServiceError::Infra(e.to_string()))?,
                txn,
            )
            .await
            .map_err(|e| {
                tracing::error!(tenant_id = %tenant_id, error = %e, "Outbox append failed for OAuth token refresh");
                TempoServiceError::Infra(e.to_string())
            })?;

        tracing::info!(tenant_id = %tenant_id, event_id = %event.id, "OAuth token refresh saga completed");
        Ok(event)
    }
}
