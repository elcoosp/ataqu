//! Email tracking repository.
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use uuid::Uuid;

use crate::entities::email_tracking as tracking_entity;
use crate::email_tracking_writer::TrackingEvent;
use ataqu_domain_cinq::error::CinqDomainError;
use ataqu_kernel::TenantId;

pub struct EmailTrackingRepository {
    db: DatabaseConnection,
}

impl EmailTrackingRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn get_tracking_events_for_contact(
        &self,
        tenant_id: &TenantId,
        contact_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<TrackingEvent>, CinqDomainError> {
        let models = tracking_entity::Entity::find()
            .filter(tracking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(tracking_entity::Column::ContactId.eq(contact_id))
            .limit(limit)
            .offset(offset)
            .order_by_desc(tracking_entity::Column::OccurredAt)
            .all(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;

        let events = models
            .into_iter()
            .map(|m| TrackingEvent {
                tenant_id: m.tenant_id,
                contact_id: m.contact_id,
                event_type: m.event_type,
                metadata: m.metadata,
                occurred_at: m.occurred_at,
            })
            .collect();
        Ok(events)
    }
}
