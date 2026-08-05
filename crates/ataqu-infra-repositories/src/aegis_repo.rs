//! AEGIS user repository implementation using SeaORM for the domain trait.
use sea_orm::ConnectionTrait;
use async_trait::async_trait;
use ataqu_domain_aegis::{AuthError, AuthRepository, User as DomainUser};
use ataqu_kernel::TenantId;
use ataqu_security::Email;
use sea_orm::{
    ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
};
use uuid::Uuid;

// SeaORM entity for users (module-scoped)
mod user_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

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
        pub is_active: bool,
        pub role: String,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
        pub last_login_at: Option<DateTime<Utc>>,
        pub deleted_at: Option<DateTime<Utc>>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

// Repository implementation
pub struct AegisUserRepository {
    db: DatabaseConnection,
}

impl AegisUserRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

// Helper conversions
fn domain_to_active(user: &DomainUser) -> user_entity::ActiveModel {
    user_entity::ActiveModel {
        id: Set(user.id),
        tenant_id: Set(user.tenant_id.as_uuid()),
        email: Set(user.email.as_ref().to_string()),
        password_hash: Set(user.password_hash.clone()),
        mfa_secret: Set(user.mfa_secret.clone()),
        name: Set(user.name.clone()),
        mfa_enabled: Set(user.mfa_enabled),
        is_active: Set(user.is_active),
        role: Set(user.role.clone()),
        created_at: Set(user.created_at.into()),
        updated_at: Set(user.updated_at.into()),
        last_login_at: Set(user.last_login_at.map(|t| t.into())),
        deleted_at: Set(None),
    }
}

fn model_to_domain(model: user_entity::Model) -> DomainUser {
    DomainUser {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        email: Email::new(model.email),
        password_hash: model.password_hash,
        mfa_secret: model.mfa_secret,
        name: model.name,
        mfa_enabled: model.mfa_enabled,
        is_active: model.is_active,
        role: model.role,
        created_at: model.created_at.into(),
        updated_at: model.updated_at.into(),
        last_login_at: model.last_login_at.map(|t| t.into()),
    }
}

#[async_trait]
impl AuthRepository for AegisUserRepository {
    async fn find_by_email(&self, email: &Email) -> Result<Option<DomainUser>, AuthError> {
        let model = user_entity::Entity::find()
            .filter(user_entity::Column::Email.eq(email.as_ref()))
            .filter(user_entity::Column::DeletedAt.is_null())
            .one(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(model.map(model_to_domain))
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<DomainUser>, AuthError> {
        let model = user_entity::Entity::find()
            .filter(user_entity::Column::Id.eq(id))
            .filter(user_entity::Column::DeletedAt.is_null())
            .one(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(model.map(model_to_domain))
    }

    async fn save_user(&self, user: &DomainUser) -> Result<(), AuthError> {
        let active = domain_to_active(user);
        let exists = user_entity::Entity::find()
            .filter(user_entity::Column::Id.eq(user.id))
            .one(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?
            .is_some();
        if exists {
            let mut active_update = active;
            active_update.updated_at = Set(chrono::Utc::now());
            user_entity::Entity::update(active_update)
                .exec(&self.db)
                .await
                .map_err(|e| AuthError::Database(e.to_string()))?;
        } else {
            user_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| AuthError::Database(e.to_string()))?;
        }
        Ok(())
    }

    async fn list_users(&self, tenant_id: Uuid) -> Result<Vec<DomainUser>, AuthError> {
        let models = user_entity::Entity::find()
            .filter(user_entity::Column::TenantId.eq(tenant_id))
            .filter(user_entity::Column::DeletedAt.is_null())
            .all(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(models.into_iter().map(model_to_domain).collect())
    }

    async fn save_api_key(&self, key: &ataqu_domain_aegis::api_key::ApiKey) -> Result<(), AuthError> {
        let active = api_key_entity::ActiveModel {
            id: Set(key.id),
            tenant_id: Set(key.tenant_id.as_uuid()),
            user_id: Set(key.user_id),
            name: Set(key.name.clone()),
            key_hash: Set(key.key_hash.clone()),
            prefix: Set(key.prefix.clone()),
            last_used_at: Set(key.last_used_at.map(|t| t.into())),
            expires_at: Set(key.expires_at.map(|t| t.into())),
            created_at: Set(key.created_at.into()),
        };
        api_key_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(())
    }

    async fn find_api_key_by_hash(&self, hash: &str) -> Result<Option<ataqu_domain_aegis::api_key::ApiKey>, AuthError> {
        let model = api_key_entity::Entity::find()
            .filter(api_key_entity::Column::KeyHash.eq(hash))
            .one(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(model.map(|m| ataqu_domain_aegis::api_key::ApiKey {
            id: m.id,
            tenant_id: ataqu_kernel::TenantId::new(m.tenant_id),
            user_id: m.user_id,
            name: m.name,
            key_hash: m.key_hash,
            prefix: m.prefix,
            last_used_at: m.last_used_at.map(|t| t.into()),
            expires_at: m.expires_at.map(|t| t.into()),
            created_at: m.created_at.into(),
        }))
    }

    async fn list_api_keys(&self, tenant_id: Uuid, user_id: Uuid) -> Result<Vec<ataqu_domain_aegis::api_key::ApiKey>, AuthError> {
        let models = api_key_entity::Entity::find()
            .filter(api_key_entity::Column::TenantId.eq(tenant_id))
            .filter(api_key_entity::Column::UserId.eq(user_id))
            .all(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(models.into_iter().map(|m| ataqu_domain_aegis::api_key::ApiKey {
            id: m.id,
            tenant_id: ataqu_kernel::TenantId::new(m.tenant_id),
            user_id: m.user_id,
            name: m.name,
            key_hash: m.key_hash,
            prefix: m.prefix,
            last_used_at: m.last_used_at.map(|t| t.into()),
            expires_at: m.expires_at.map(|t| t.into()),
            created_at: m.created_at.into(),
        }).collect())
    }

    async fn delete_api_key(&self, tenant_id: Uuid, id: Uuid) -> Result<(), AuthError> {
        api_key_entity::Entity::delete_many()
            .filter(api_key_entity::Column::Id.eq(id))
            .filter(api_key_entity::Column::TenantId.eq(tenant_id))
            .exec(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(())
    }

    async fn list_tenants(&self) -> Result<Vec<Uuid>, AuthError> {
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "SELECT DISTINCT tenant_id FROM core.users",
            vec![],
        );
        let rows = self.db.query_all_raw(stmt).await.map_err(|e| AuthError::Database(e.to_string()))?;

        let mut tenants = Vec::new();
        for row in rows {
            let tenant_id: Uuid = row.try_get("", "tenant_id").map_err(|e| AuthError::Database(e.to_string()))?;
            tenants.push(tenant_id);
        }
        Ok(tenants)
    }

    async fn update_api_key_last_used(&self, id: Uuid, last_used_at: std::time::SystemTime) -> Result<(), AuthError> {
        let dt: chrono::DateTime<chrono::Utc> = last_used_at.into();
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "UPDATE core.api_keys SET last_used_at = $1 WHERE id = $2",
            vec![dt.into(), id.into()],
        );
        self.db.execute_raw(stmt).await.map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(())
    }
}

mod api_key_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "api_keys", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub user_id: Uuid,
        pub name: String,
        pub key_hash: String,
        pub prefix: String,
        pub last_used_at: Option<DateTime<Utc>>,
        pub expires_at: Option<DateTime<Utc>>,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}
