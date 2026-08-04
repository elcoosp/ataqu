//! SeaORM implementations for TEMPO domain repository.
use async_trait::async_trait;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, IntoActiveModel, QuerySelect, ActiveModelTrait};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::time::SystemTime;

use ataqu_kernel::TenantId;
use ataqu_domain_tempo::schedule::{Booking, BookingId, BookingStatus};
use ataqu_domain_tempo::repository::TempoRepository;

use crate::entities::tempo as tempo_entity;

// Helpers
fn booking_status_to_str(status: &BookingStatus) -> &'static str {
    match status {
        BookingStatus::Pending => "pending",
        BookingStatus::Confirmed => "confirmed",
        BookingStatus::Cancelled => "cancelled",
        BookingStatus::Completed => "completed",
        BookingStatus::NoShow => "no_show",
    }
}

fn str_to_booking_status(s: &str) -> BookingStatus {
    match s {
        "pending" => BookingStatus::Pending,
        "confirmed" => BookingStatus::Confirmed,
        "cancelled" => BookingStatus::Cancelled,
        "completed" => BookingStatus::Completed,
        "no_show" => BookingStatus::NoShow,
        _ => BookingStatus::Pending,
    }
}

fn booking_to_active(booking: &Booking) -> tempo_entity::ActiveModel {
    tempo_entity::ActiveModel {
        id: Set(booking.id.0),
        tenant_id: Set(booking.tenant_id.as_uuid()),
        event_type_id: Set(booking.event_type_id.0),
        starts_at: Set(DateTime::<Utc>::from(booking.starts_at)),
        duration_seconds: Set(booking.duration_minutes * 60),
        status: Set(booking_status_to_str(&booking.status).to_string()),
        oauth_access_token: Set(None),
        oauth_refresh_token: Set(None),
        oauth_token_expires_at: Set(None),
        created_at: Set(DateTime::<Utc>::from(booking.starts_at)),
        updated_at: Set(DateTime::<Utc>::from(booking.starts_at)),
    }
}

fn model_to_booking(model: tempo_entity::Model) -> Booking {
    Booking {
        id: BookingId(model.id),
        tenant_id: TenantId::new(model.tenant_id),
        event_type_id: ataqu_domain_tempo::schedule::EventTypeId(model.event_type_id),
        starts_at: model.starts_at.into(),
        duration_minutes: model.duration_seconds / 60,
        status: str_to_booking_status(&model.status),
    }
}

pub struct TempoRepositoryImpl {
    db: DatabaseConnection,
}

impl TempoRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl TempoRepository for TempoRepositoryImpl {
    async fn create_booking(&self, booking: &Booking) -> Result<(), String> {
        let active = booking_to_active(booking);
        tempo_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn find_booking_by_id(&self, tenant_id: &TenantId, id: &BookingId) -> Result<Option<Booking>, String> {
        let model = tempo_entity::Entity::find()
            .filter(tempo_entity::Column::Id.eq(id.0))
            .filter(tempo_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(model.map(model_to_booking))
    }

    async fn list_bookings(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> Result<Vec<Booking>, String> {
        let models = tempo_entity::Entity::find()
            .filter(tempo_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models.into_iter().map(model_to_booking).collect())
    }

    async fn update_booking_status(&self, tenant_id: &TenantId, id: &BookingId, status: BookingStatus) -> Result<(), String> {
        let mut active = tempo_entity::Entity::find()
            .filter(tempo_entity::Column::Id.eq(id.0))
            .filter(tempo_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Booking not found".to_string())?
            .into_active_model();
        active.status = Set(booking_status_to_str(&status).to_string());
        active.update(&self.db).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn find_bookings_for_no_show_check(&self, tenant_id: &TenantId, upper_bound: SystemTime) -> Result<Vec<Booking>, String> {
        let upper_dt: DateTime<Utc> = upper_bound.into();
        let models = tempo_entity::Entity::find()
            .filter(tempo_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(tempo_entity::Column::StartsAt.lt(upper_dt))
            .filter(tempo_entity::Column::Status.is_in(vec!["pending", "confirmed"]))
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models.into_iter().map(model_to_booking).collect())
    }
}
