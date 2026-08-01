use chrono::{DateTime, Duration, Utc};
use sea_orm::entity::prelude::*;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct Booking {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub starts_at: DateTime<Utc>,
    pub duration: Duration,
    pub ends_at: DateTime<Utc>,
    pub oauth_access_token: Option<String>,
    pub oauth_refresh_token: Option<String>,
    pub oauth_token_expires_at: Option<DateTime<Utc>>,
}

pub mod bookings {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[sea_orm::model]
    #[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
    #[sea_orm(table_name = "bookings", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub starts_at: DateTime<Utc>,
        #[sea_orm(column_name = "duration_seconds")]
        pub duration_seconds: i32,
        pub ends_at: DateTime<Utc>,
        pub oauth_access_token: Option<String>,
        pub oauth_refresh_token: Option<String>,
        pub oauth_token_expires_at: Option<DateTime<Utc>>,
    }

    impl ActiveModelBehavior for ActiveModel {}
}

#[async_trait::async_trait]
pub trait TempoRepository: Send + Sync {
    async fn create_booking(&self, booking: Booking) -> Result<(), sea_orm::DbErr>;
    async fn find_no_shows(&self, tenant_id: &Uuid) -> Result<Vec<Booking>, sea_orm::DbErr>;
    async fn save_oauth_token(
        &self,
        booking_id: &Uuid,
        access_token: Option<String>,
        refresh_token: Option<String>,
        expires_at: Option<DateTime<Utc>>,
    ) -> Result<(), sea_orm::DbErr>;
}

pub struct SeaOrmTempoRepository {
    db: sea_orm::DatabaseConnection,
}

impl SeaOrmTempoRepository {
    pub fn new(db: sea_orm::DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait::async_trait]
impl TempoRepository for SeaOrmTempoRepository {
    async fn create_booking(&self, booking: Booking) -> Result<(), sea_orm::DbErr> {
        let active_model = bookings::ActiveModel {
            id: sea_orm::Set(booking.id),
            tenant_id: sea_orm::Set(booking.tenant_id),
            starts_at: sea_orm::Set(booking.starts_at),
            duration_seconds: sea_orm::Set(booking.duration.num_seconds() as i32),
            ends_at: sea_orm::NotSet, // Generated column
            oauth_access_token: sea_orm::Set(booking.oauth_access_token),
            oauth_refresh_token: sea_orm::Set(booking.oauth_refresh_token),
            oauth_token_expires_at: sea_orm::Set(booking.oauth_token_expires_at),
        };
        bookings::Entity::insert(active_model)
            .exec(&self.db)
            .await?;
        Ok(())
    }

    async fn find_no_shows(&self, tenant_id: &Uuid) -> Result<Vec<Booking>, sea_orm::DbErr> {
        // ADR-032: Sargable and bounded query: ends_at < NOW() - 24 hours
        let threshold = Utc::now() - Duration::hours(24);

        let results: Vec<bookings::Model> = bookings::Entity::find()
            .filter(bookings::COLUMN.tenant_id.eq(*tenant_id))
            .filter(bookings::COLUMN.ends_at.lt(threshold))
            .all(&self.db)
            .await?;

        Ok(results
            .into_iter()
            .map(|m| Booking {
                id: m.id,
                tenant_id: m.tenant_id,
                starts_at: m.starts_at,
                duration: Duration::seconds(m.duration_seconds as i64),
                ends_at: m.ends_at,
                oauth_access_token: m.oauth_access_token,
                oauth_refresh_token: m.oauth_refresh_token,
                oauth_token_expires_at: m.oauth_token_expires_at,
            })
            .collect())
    }

    async fn save_oauth_token(
        &self,
        booking_id: &Uuid,
        access_token: Option<String>,
        refresh_token: Option<String>,
        expires_at: Option<DateTime<Utc>>,
    ) -> Result<(), sea_orm::DbErr> {
        let mut active_model: bookings::ActiveModel = bookings::Entity::find_by_id(*booking_id)
            .one(&self.db)
            .await?
            .ok_or_else(|| sea_orm::DbErr::RecordNotFound("Booking not found".to_string()))?
            .into();

        active_model.oauth_access_token = sea_orm::Set(access_token);
        active_model.oauth_refresh_token = sea_orm::Set(refresh_token);
        active_model.oauth_token_expires_at = sea_orm::Set(expires_at);

        active_model.update(&self.db).await?;
        Ok(())
    }
}
