//! AEGIS user repository implementation using SeaORM.

use once_cell::sync::OnceCell;
use sea_orm::{
    ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, entity::prelude::*,
};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::runtime::Runtime;
use tracing::{debug, info, warn};
use uuid::Uuid;

use ataqu_domain_aegis::{AuthError, AuthRepository, Email, User as DomainUser};
use ataqu_kernel::TenantId;

// Global runtime for blocking on async operations
static RUNTIME: OnceCell<Runtime> = OnceCell::new();

fn get_runtime() -> &'static Runtime {
    RUNTIME.get_or_init(|| Runtime::new().expect("Failed to create Tokio runtime"))
}

// ----------------------------------------------------------------------
// SeaORM Entity (core.users)
// ----------------------------------------------------------------------
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "users", schema_name = "core")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub mfa_secret: Option<String>,
    pub name: Option<String>,
    pub mfa_enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub deleted_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

// ----------------------------------------------------------------------
// Repository
// ----------------------------------------------------------------------
pub struct AegisUserRepository {
    db: DatabaseConnection,
}

impl AegisUserRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    // Helper: chrono::DateTime -> SystemTime
    fn datetime_to_system_time(dt: chrono::DateTime<chrono::Utc>) -> SystemTime {
        let nanos = dt.timestamp_nanos_opt().unwrap_or(0);
        UNIX_EPOCH + std::time::Duration::from_nanos(nanos as u64)
    }

    // Helper: SystemTime -> chrono::DateTime
    fn system_time_to_datetime(st: SystemTime) -> chrono::DateTime<chrono::Utc> {
        let dur = st.duration_since(UNIX_EPOCH).unwrap_or_default();
        chrono::DateTime::from_timestamp(dur.as_secs() as i64, dur.subsec_nanos())
            .unwrap_or_else(chrono::Utc::now)
    }

    // Helper: domain -> active model
    fn domain_to_active(user: &DomainUser) -> ActiveModel {
        ActiveModel {
            id: Set(user.id),
            tenant_id: Set(user.tenant_id.as_uuid()),
            email: Set(user.email.as_ref().to_string()),
            password_hash: Set(user.password_hash.clone()),
            mfa_secret: Set(None),
            name: Set(user.name.clone()),
            mfa_enabled: Set(user.mfa_enabled),
            created_at: Set(Self::system_time_to_datetime(user.created_at)),
            updated_at: Set(Self::system_time_to_datetime(user.updated_at)),
            deleted_at: Set(None),
        }
    }

    // Helper: model -> domain
    fn model_to_domain(model: Model) -> DomainUser {
        DomainUser {
            id: model.id,
            tenant_id: TenantId::new(model.tenant_id),
            email: Email::new(model.email),
            password_hash: model.password_hash,
            name: model.name,
            mfa_enabled: model.mfa_enabled,
            created_at: Self::datetime_to_system_time(model.created_at),
            updated_at: Self::datetime_to_system_time(model.updated_at),
        }
    }
}

// Implement trait synchronously, using global runtime for async DB ops.
impl AuthRepository for AegisUserRepository {
    fn find_by_email(&self, email: &Email) -> Option<DomainUser> {
        debug!(email = %email.as_ref(), "Finding user by email");
        let result = get_runtime().block_on(async {
            Entity::find()
                .filter(Column::Email.eq(email.as_ref()))
                .filter(Column::DeletedAt.is_null())
                .one(&self.db)
                .await
        });
        match result {
            Ok(Some(model)) => Some(Self::model_to_domain(model)),
            Ok(None) => {
                debug!("User not found");
                None
            }
            Err(e) => {
                warn!(error = %e, "Database error in find_by_email");
                None
            }
        }
    }

    fn save_user(&self, user: &DomainUser) -> Result<(), AuthError> {
        debug!(user_id = %user.id, "Saving user");
        let active = Self::domain_to_active(user);
        let exists = get_runtime()
            .block_on(async {
                Entity::find()
                    .filter(Column::Id.eq(user.id))
                    .one(&self.db)
                    .await
            })
            .map_err(|e| {
                warn!(error = %e, "Database error checking existence");
                AuthError::UserNotFound
            })?
            .is_some();

        if exists {
            let mut active_update = active;
            let now = chrono::Utc::now();
            active_update.updated_at = Set(now);
            get_runtime()
                .block_on(async { active_update.update(&self.db).await })
                .map_err(|e| {
                    warn!(error = %e, "Failed to update user");
                    AuthError::UserNotFound
                })?;
            info!(user_id = %user.id, "User updated");
        } else {
            get_runtime()
                .block_on(async { active.insert(&self.db).await })
                .map_err(|e| {
                    warn!(error = %e, "Failed to insert user");
                    AuthError::UserNotFound
                })?;
            info!(user_id = %user.id, "User inserted");
        }
        Ok(())
    }
}
