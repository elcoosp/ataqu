use async_trait::async_trait;
use ataqu_domain_tempo::availability::AvailabilitySlot;
use ataqu_domain_tempo::event_type::EventType;
use ataqu_domain_tempo::repository::TempoRepository;
use ataqu_domain_tempo::schedule::{Booking, BookingId, BookingStatus, EventTypeId};
use ataqu_kernel::{RepositoryError, TenantId};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter, QuerySelect, Set,
};
use std::time::SystemTime;
use uuid::Uuid;

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
        pub slug: String,
        pub description: Option<String>,
        pub duration_minutes: i32,
        pub is_active: bool,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
        pub version: i32,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

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
        pub event_type_id: Uuid,
        pub starts_at: DateTime<Utc>,
        pub duration_minutes: i32,
        pub timezone: String,
        pub status: String,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
        pub reminder_sent: bool,
        pub version: i32,
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

#[allow(clippy::useless_conversion)]
impl TempoRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn map_booking(m: booking_entity::Model) -> Booking {
    Booking {
        id: BookingId(m.id),
        tenant_id: TenantId::new(m.tenant_id),
        event_type_id: EventTypeId(m.event_type_id),
        starts_at: m.starts_at.into(),
        duration_minutes: m.duration_minutes,
        timezone: m.timezone,
        status: match m.status.as_str() {
            "confirmed" => BookingStatus::Confirmed,
            "cancelled" => BookingStatus::Cancelled,
            "completed" => BookingStatus::Completed,
            "noshow" => BookingStatus::NoShow,
            _ => BookingStatus::Pending,
        },
        created_at: m.created_at.into(),
        reminder_sent_at: if m.reminder_sent {
            Some(m.updated_at.into())
        } else {
            None
        },
        version: m.version,
    }
}

#[async_trait]
impl TempoRepository for TempoRepositoryImpl {
    async fn save_event_type(&self, event_type: &EventType) -> Result<(), RepositoryError> {
        let active = event_type_entity::ActiveModel {
            id: Set(event_type.id.0),
            tenant_id: Set(event_type.tenant_id.as_uuid()),
            name: Set(event_type.name.clone()),
            slug: Set(event_type.slug.clone()),
            description: Set(event_type.description.clone()),
            duration_minutes: Set(event_type.duration_minutes),
            is_active: Set(event_type.is_active),
            created_at: Set(event_type.created_at),
            updated_at: Set(event_type.updated_at),
            version: Set(event_type.version),
        };
        event_type_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn count_event_types(&self, _tenant_id: &TenantId) -> Result<u64, RepositoryError> {
        Ok(0)
    }

    async fn list_event_types(
        &self,
        tenant_id: &TenantId,
    ) -> Result<Vec<EventType>, RepositoryError> {
        let models = event_type_entity::Entity::find()
            .filter(event_type_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(models
            .into_iter()
            .map(|m| EventType {
                id: EventTypeId(m.id),
                tenant_id: TenantId::new(m.tenant_id),
                name: m.name,
                slug: m.slug,
                description: m.description,
                duration_minutes: m.duration_minutes,
                is_active: m.is_active,
                created_at: m.created_at.into(),
                updated_at: m.updated_at,
                version: m.version,
            })
            .collect())
    }

    async fn find_event_type_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> Result<Option<EventType>, RepositoryError> {
        let model = event_type_entity::Entity::find()
            .filter(event_type_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(event_type_entity::Column::Id.eq(id))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(model.map(|m| EventType {
            id: EventTypeId(m.id),
            tenant_id: TenantId::new(m.tenant_id),
            name: m.name,
            slug: m.slug,
            description: m.description,
            duration_minutes: m.duration_minutes,
            is_active: m.is_active,
            created_at: m.created_at.into(),
            updated_at: m.updated_at,
            version: m.version,
        }))
    }

    async fn find_event_type_by_slug(
        &self,
        tenant_id: &TenantId,
        slug: &str,
    ) -> Result<Option<EventType>, RepositoryError> {
        let model = event_type_entity::Entity::find()
            .filter(event_type_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(event_type_entity::Column::Slug.eq(slug))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(model.map(|m| EventType {
            id: EventTypeId(m.id),
            tenant_id: TenantId::new(m.tenant_id),
            name: m.name,
            slug: m.slug,
            description: m.description,
            duration_minutes: m.duration_minutes,
            is_active: m.is_active,
            created_at: m.created_at.into(),
            updated_at: m.updated_at,
            version: m.version,
        }))
    }

    async fn update_event_type(&self, event_type: &EventType) -> Result<(), RepositoryError> {
        let active = event_type_entity::ActiveModel {
            id: Set(event_type.id.0),
            tenant_id: Set(event_type.tenant_id.as_uuid()),
            name: Set(event_type.name.clone()),
            slug: Set(event_type.slug.clone()),
            description: Set(event_type.description.clone()),
            duration_minutes: Set(event_type.duration_minutes),
            is_active: Set(event_type.is_active),
            created_at: Set(event_type.created_at),
            updated_at: Set(event_type.updated_at),
            version: Set(event_type.version),
        };
        event_type_entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn delete_event_type(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> Result<(), RepositoryError> {
        event_type_entity::Entity::delete_many()
            .filter(event_type_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(event_type_entity::Column::Id.eq(id))
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn create_booking(&self, booking: &Booking) -> Result<(), RepositoryError> {
        let active = booking_entity::ActiveModel {
            id: Set(booking.id.0),
            tenant_id: Set(booking.tenant_id.as_uuid()),
            event_type_id: Set(booking.event_type_id.0),
            starts_at: Set(booking.starts_at.into()),
            duration_minutes: Set(booking.duration_minutes),
            timezone: Set(booking.timezone.clone()),
            status: Set(format!("{:?}", booking.status).to_lowercase()),
            created_at: Set(booking.created_at.into()),
            updated_at: Set(Utc::now()),
            reminder_sent: Set(false),
            version: Set(0),
        };
        booking_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn find_booking_by_id(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
    ) -> Result<Option<Booking>, RepositoryError> {
        let model = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::Id.eq(id.0))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(model.map(map_booking))
    }

    async fn count_bookings(&self, _tenant_id: &TenantId) -> Result<u64, RepositoryError> {
        Ok(0)
    }

    async fn list_bookings(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Booking>, RepositoryError> {
        let models = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(models.into_iter().map(map_booking).collect())
    }

    async fn update_booking_status(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
        status: BookingStatus,
    ) -> Result<(), RepositoryError> {
        let mut active = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::Id.eq(id.0))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .ok_or(RepositoryError::NotFound)?
            .into_active_model();

        active.status = Set(format!("{:?}", status).to_lowercase());
        active.updated_at = Set(Utc::now());

        booking_entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn reschedule_booking(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
        starts_at: DateTime<Utc>,
    ) -> Result<(), RepositoryError> {
        let mut active = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::Id.eq(id.0))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .ok_or(RepositoryError::NotFound)?
            .into_active_model();

        active.starts_at = Set(starts_at);
        active.updated_at = Set(Utc::now());

        booking_entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn update_booking_version(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
        version: i32,
    ) -> Result<(), RepositoryError> {
        let mut active = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::Id.eq(id.0))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .ok_or(RepositoryError::NotFound)?
            .into_active_model();

        active.version = Set(version);
        active.updated_at = Set(Utc::now());

        booking_entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn check_overlap(
        &self,
        tenant_id: &TenantId,
        event_type_id: Uuid,
        starts_at: SystemTime,
        ends_at: SystemTime,
    ) -> Result<bool, RepositoryError> {
        let start_dt: DateTime<Utc> = starts_at.into();
        let end_dt: DateTime<Utc> = ends_at.into();
        let count = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::EventTypeId.eq(event_type_id))
            .filter(booking_entity::Column::StartsAt.lt(end_dt))
            .filter(booking_entity::Column::StartsAt.gte(start_dt))
            .count(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(count > 0)
    }

    async fn find_bookings_for_no_show_check(
        &self,
        tenant_id: &TenantId,
        lower_bound: SystemTime,
        upper_bound: SystemTime,
    ) -> Result<Vec<Booking>, RepositoryError> {
        let lower_dt: DateTime<Utc> = lower_bound.into();
        let upper_dt: DateTime<Utc> = upper_bound.into();
        let models = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::StartsAt.between(lower_dt, upper_dt))
            .filter(booking_entity::Column::Status.eq("pending"))
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(models.into_iter().map(map_booking).collect())
    }

    async fn find_upcoming_bookings_for_reminder(
        &self,
        tenant_id: &TenantId,
        start_bound: SystemTime,
        end_bound: SystemTime,
    ) -> Result<Vec<Booking>, RepositoryError> {
        let start_dt: DateTime<Utc> = start_bound.into();
        let end_dt: DateTime<Utc> = end_bound.into();
        let models = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::StartsAt.between(start_dt, end_dt))
            .filter(booking_entity::Column::ReminderSent.eq(false))
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(models.into_iter().map(map_booking).collect())
    }

    async fn mark_reminder_sent(
        &self,
        tenant_id: &TenantId,
        id: &BookingId,
        now: SystemTime,
    ) -> Result<(), RepositoryError> {
        let mut active = booking_entity::Entity::find()
            .filter(booking_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(booking_entity::Column::Id.eq(id.0))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?
            .ok_or(RepositoryError::NotFound)?
            .into_active_model();

        active.reminder_sent = Set(true);
        active.updated_at = Set(now.into());

        booking_entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn save_availability_slot(&self, slot: &AvailabilitySlot) -> Result<(), RepositoryError> {
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
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }

    async fn list_availability_slots(
        &self,
        tenant_id: &TenantId,
        event_type_id: &EventTypeId,
    ) -> Result<Vec<AvailabilitySlot>, RepositoryError> {
        let models = availability_slot_entity::Entity::find()
            .filter(availability_slot_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(availability_slot_entity::Column::EventTypeId.eq(event_type_id.0))
            .all(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;

        Ok(models
            .into_iter()
            .map(|m| AvailabilitySlot {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                event_type_id: m.event_type_id,
                start_time: m.start_time,
                end_time: m.end_time,
                is_booked: m.is_booked,
            })
            .collect())
    }

    async fn delete_availability_slot(
        &self,
        tenant_id: &TenantId,
        slot_id: Uuid,
    ) -> Result<(), RepositoryError> {
        availability_slot_entity::Entity::delete_many()
            .filter(availability_slot_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(availability_slot_entity::Column::Id.eq(slot_id))
            .exec(&self.db)
            .await
            .map_err(|e| RepositoryError::Database(e.to_string()))?;
        Ok(())
    }
}
