use async_trait::async_trait;
use ataqu_domain_tempo::availability::AvailabilitySlot;
use ataqu_domain_tempo::event_type::EventType;
use ataqu_domain_tempo::schedule::{Booking, BookingId, BookingStatus, EventTypeId};
use ataqu_domain_tempo::repository::TempoRepository;
use ataqu_kernel::TenantId;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, Set,
};
use chrono::{DateTime, Utc};
use uuid::Uuid;

mod booking_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "bookings", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub event_type_id: Option<Uuid>,
        pub starts_at: DateTime<Utc>,
        pub duration_seconds: i32,
        pub ends_at: DateTime<Utc>,
        pub status: String,
        pub timezone: Option<String>,
        pub reminder_sent_at: Option<DateTime<Utc>>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod event_type_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "event_types", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub name: String,
        pub description: Option<String>,
        pub duration_minutes: i32,
        pub is_active: bool,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod availability_slot_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "availability_slots", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub event_type_id: Uuid,
        pub start_time: DateTime<Utc>,
        pub end_time: DateTime<Utc>,
        pub is_booked: bool,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub struct TempoRepositoryImpl {
    db: DatabaseConnection,
}

impl TempoRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn booking_model_to_domain(model: booking_entity::Model) -> Booking {
    let status = match model.status.as_str() {
        "confirmed" => BookingStatus::Confirmed,
        "cancelled" => BookingStatus::Cancelled,
        "completed" => BookingStatus::Completed,
        "no_show" => BookingStatus::NoShow,
        _ => BookingStatus::Pending,
    };
    Booking {
        id: BookingId(model.id),
        tenant_id: TenantId::new(model.tenant_id),
        event_type_id: EventTypeId(model.event_type_id.unwrap_or_default()),
        starts_at: model.starts_at.into(),
        duration_minutes: model.duration_seconds / 60,
        status,
        timezone: model.timezone.unwrap_or_else(|| "UTC".to_string()),
        reminder_sent_at: model.reminder_sent_at.map(|dt| dt.into()),
    }
}

#[async_trait]
impl TempoRepository for TempoRepositoryImpl {
    async fn create_booking(&self, booking: &Booking) -> Result<(), String> {
        let status_str = match booking.status {
            BookingStatus::Pending => "pending",
            BookingStatus::Confirmed => "confirmed",
            BookingStatus::Cancelled => "cancelled",
            BookingStatus::Completed => "completed",
            BookingStatus::NoShow => "no_show",
        };

        let starts_at_dt: DateTime<Utc> = booking.starts_at.into();
        let ends_at_dt = starts_at_dt + chrono::Duration::minutes(booking.duration_minutes as i64);

        let active = booking_entity::ActiveModel {
            id: Set(booking.id.0),
            tenant_id: Set(booking.tenant_id.as_uuid()),
            event_type_id: Set(Some(booking.event_type_id.0)),
            starts_at: Set(starts_at_dt),
            duration_seconds: Set(booking.duration_minutes * 60),
            ends_at: Set(ends_at_dt),
            status: Set(status_str.to_string()),
            timezone: Set(Some(booking.timezone.clone())),
            reminder_sent_at: Set(None),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };
        booking_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn find_booking_by_id(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
    ) -> Result<Option<Booking>, String> {
        let model = booking_entity::Entity::find()
            .filter(booking_entity::Column::Id.eq(id.0))
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(model.map(booking_model_to_domain))
    }

    async fn list_bookings(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Booking>, String> {
        let models = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models.into_iter().map(booking_model_to_domain).collect())
    }

    async fn update_booking_status(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
        status: BookingStatus,
    ) -> Result<(), String> {
        let status_str = match status {
            BookingStatus::Pending => "pending",
            BookingStatus::Confirmed => "confirmed",
            BookingStatus::Cancelled => "cancelled",
            BookingStatus::Completed => "completed",
            BookingStatus::NoShow => "no_show",
        };
        let mut active: booking_entity::ActiveModel = booking_entity::Entity::find()
            .filter(booking_entity::Column::Id.eq(id.0))
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Booking not found".to_string())?
            .into();
        active.status = Set(status_str.to_string());
        active.update(&self.db).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn find_bookings_for_no_show_check(
        &self,
        tenant_id: &TenantId,
        upper_bound: std::time::SystemTime,
    ) -> Result<Vec<Booking>, String> {
        let upper_bound_dt = chrono::DateTime::<chrono::Utc>::from(upper_bound);
        let models = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::EndsAt.lte(upper_bound_dt))
            .filter(booking_entity::Column::Status.is_in(vec!["pending", "confirmed"]))
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models.into_iter().map(booking_model_to_domain).collect())
    }

    async fn save_event_type(&self, event_type: &EventType) -> Result<(), String> {
        let active = event_type_entity::ActiveModel {
            id: Set(event_type.id.0),
            tenant_id: Set(event_type.tenant_id.as_uuid()),
            name: Set(event_type.name.clone()),
            description: Set(event_type.description.clone()),
            duration_minutes: Set(event_type.duration_minutes),
            is_active: Set(event_type.is_active),
            created_at: Set(event_type.created_at),
            updated_at: Set(event_type.updated_at),
        };
        event_type_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_event_types(&self, tenant_id: &TenantId) -> Result<Vec<EventType>, String> {
        let models = event_type_entity::Entity::find()
            .filter(event_type_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(models.into_iter().map(|m| EventType {
            id: EventTypeId(m.id),
            tenant_id: TenantId::new(m.tenant_id),
            name: m.name,
            description: m.description,
            duration_minutes: m.duration_minutes,
            is_active: m.is_active,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }).collect())
    }

    async fn save_availability_slot(&self, slot: &AvailabilitySlot) -> Result<(), String> {
        let active = availability_slot_entity::ActiveModel {
            id: Set(slot.id),
            tenant_id: Set(slot.tenant_id.as_uuid()),
            event_type_id: Set(slot.event_type_id),
            start_time: Set(slot.start_time),
            end_time: Set(slot.end_time),
            is_booked: Set(slot.is_booked),
            created_at: Set(Utc::now()),
        };
        availability_slot_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_availability_slots(&self, tenant_id: &TenantId, event_type_id: &Uuid) -> Result<Vec<AvailabilitySlot>, String> {
        let models = availability_slot_entity::Entity::find()
            .filter(availability_slot_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(availability_slot_entity::Column::EventTypeId.eq(*event_type_id))
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models.into_iter().map(|m| AvailabilitySlot {
            id: m.id,
            tenant_id: TenantId::new(m.tenant_id),
            event_type_id: m.event_type_id,
            start_time: m.start_time,
            end_time: m.end_time,
            is_booked: m.is_booked,
        }).collect())
    }

    async fn delete_availability_slot(&self, tenant_id: &TenantId, slot_id: &Uuid) -> Result<(), String> {
        availability_slot_entity::Entity::delete_many()
            .filter(availability_slot_entity::Column::Id.eq(*slot_id))
            .filter(availability_slot_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn find_upcoming_bookings_for_reminder(
        &self,
        tenant_id: &TenantId,
        start_bound: std::time::SystemTime,
        end_bound: std::time::SystemTime,
    ) -> Result<Vec<Booking>, String> {
        let start_dt = chrono::DateTime::<chrono::Utc>::from(start_bound);
        let end_dt = chrono::DateTime::<chrono::Utc>::from(end_bound);
        let models = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::StartsAt.between(start_dt, end_dt))
            .filter(booking_entity::Column::ReminderSentAt.is_null())
            .filter(booking_entity::Column::Status.is_in(vec!["pending", "confirmed"]))
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models.into_iter().map(booking_model_to_domain).collect())
    }

    async fn mark_reminder_sent(&self, tenant_id: &TenantId, booking_id: &BookingId, sent_at: std::time::SystemTime) -> Result<(), String> {
        let sent_dt = chrono::DateTime::<chrono::Utc>::from(sent_at);
        let mut active: booking_entity::ActiveModel = booking_entity::Entity::find()
            .filter(booking_entity::Column::Id.eq(booking_id.0))
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Booking not found".to_string())?
            .into();
        active.reminder_sent_at = Set(Some(sent_dt));
        active.update(&self.db).await.map_err(|e| e.to_string())?;
        Ok(())
    }
}
