use async_trait::async_trait;
use ataqu_domain_aegis::api_key::ApiKey;
use ataqu_domain_aegis::{AuthError, AuthRepository, User};
use ataqu_kernel::TenantId;
use ataqu_security::Email;
use sea_orm::entity::prelude::*;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use std::time::SystemTime;
use uuid::Uuid;

mod user_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "users", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub email: String,
        pub password_hash: String,
        pub mfa_secret: Option<String>,
        pub mfa_enabled: bool,
        pub is_active: bool,
        pub name: Option<String>,
        pub role: String,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
        pub last_login_at: Option<DateTime<Utc>>,
        pub version: i32,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod api_key_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "api_keys", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub user_id: Uuid,
        pub name: String,
        pub key_hash: String,
        pub prefix: String,
        pub scopes: Vec<String>,
        pub last_used_at: Option<DateTime<Utc>>,
        pub expires_at: Option<DateTime<Utc>>,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub struct AegisUserRepository {
    db: DatabaseConnection,
}

impl AegisUserRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn model_to_domain(model: user_entity::Model) -> User {
    User {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        email: Email::new(model.email),
        password_hash: model.password_hash,
        name: model.name,
        mfa_secret: model.mfa_secret,
        mfa_enabled: model.mfa_enabled,
        is_active: model.is_active,
        role: model.role,
        created_at: model.created_at.into(),
        updated_at: model.updated_at.into(),
        last_login_at: model.last_login_at.map(|t| t.into()),
        version: model.version,
    }
}

fn domain_to_active(user: &User) -> user_entity::ActiveModel {
    user_entity::ActiveModel {
        id: Set(user.id),
        tenant_id: Set(user.tenant_id.as_uuid()),
        email: Set(user
            .email
            .reveal(&ataqu_security::PiiAccessKey::new())
            .to_string()),
        password_hash: Set(user.password_hash.clone()),
        mfa_secret: Set(user.mfa_secret.clone()),
        mfa_enabled: Set(user.mfa_enabled),
        is_active: Set(user.is_active),
        name: Set(user.name.clone()),
        role: Set(user.role.clone()),
        created_at: Set(user.created_at.into()),
        updated_at: Set(user.updated_at.into()),
        last_login_at: Set(user.last_login_at.map(|t| t.into())),
        version: Set(user.version),
    }
}

#[async_trait]
impl AuthRepository for AegisUserRepository {
    async fn find_by_email(
        &self,
        email: &Email,
        tenant_id: Option<TenantId>,
    ) -> Result<Option<User>, AuthError> {
        let email_str = email.reveal(&ataqu_security::PiiAccessKey::new());
        let mut query =
            user_entity::Entity::find().filter(user_entity::Column::Email.eq(email_str));
        if let Some(tid) = tenant_id {
            query = query.filter(user_entity::Column::TenantId.eq(tid.as_uuid()));
        }
        let model = query
            .one(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(model.map(model_to_domain))
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AuthError> {
        let model = user_entity::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(model.map(model_to_domain))
    }

    async fn save_user(&self, user: &User) -> Result<(), AuthError> {
        let active = domain_to_active(user);
        let exists = user_entity::Entity::find_by_id(user.id)
            .one(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?
            .is_some();
        if exists {
            user_entity::Entity::update(active)
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

    async fn list_users(&self, tenant_id: Uuid) -> Result<Vec<User>, AuthError> {
        let models = user_entity::Entity::find()
            .filter(user_entity::Column::TenantId.eq(tenant_id))
            .all(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(models.into_iter().map(model_to_domain).collect())
    }

    async fn list_tenants(&self) -> Result<Vec<Uuid>, AuthError> {
        let stmt = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            "SELECT DISTINCT tenant_id FROM core.users",
            [],
        );
        let rows = self
            .db
            .query_all_raw(stmt)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        let mut tenants = Vec::new();
        for row in rows {
            let tenant_id: Uuid = row
                .try_get("", "tenant_id")
                .map_err(|e| AuthError::Database(e.to_string()))?;
            tenants.push(tenant_id);
        }
        Ok(tenants)
    }

    async fn save_api_key(&self, key: &ApiKey) -> Result<(), AuthError> {
        let active = api_key_entity::ActiveModel {
            id: Set(key.id),
            tenant_id: Set(key.tenant_id.as_uuid()),
            user_id: Set(key.user_id),
            name: Set(key.name.clone()),
            key_hash: Set(key.key_hash.clone()),
            prefix: Set(key.prefix.clone()),
            scopes: Set(key.scopes.clone()),
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

    async fn list_api_keys(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<ApiKey>, AuthError> {
        let models = api_key_entity::Entity::find()
            .filter(api_key_entity::Column::TenantId.eq(tenant_id))
            .filter(api_key_entity::Column::UserId.eq(user_id))
            .all(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;

        let keys = models
            .into_iter()
            .map(|m| ApiKey {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                user_id: m.user_id,
                name: m.name,
                key_hash: m.key_hash,
                prefix: m.prefix,
                scopes: m.scopes,
                last_used_at: m.last_used_at.map(|t| t.into()),
                expires_at: m.expires_at.map(|t| t.into()),
                created_at: m.created_at.into(),
            })
            .collect();
        Ok(keys)
    }

    async fn delete_api_key(&self, tenant_id: Uuid, id: Uuid) -> Result<(), AuthError> {
        api_key_entity::Entity::delete_many()
            .filter(api_key_entity::Column::TenantId.eq(tenant_id))
            .filter(api_key_entity::Column::Id.eq(id))
            .exec(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(())
    }

    async fn update_api_key_last_used(
        &self,
        id: Uuid,
        last_used_at: SystemTime,
    ) -> Result<(), AuthError> {
        let model = api_key_entity::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;

        if let Some(m) = model {
            let mut active: api_key_entity::ActiveModel = m.into();
            active.last_used_at = Set(Some(last_used_at.into()));
            active
                .update(&self.db)
                .await
                .map_err(|e| AuthError::Database(e.to_string()))?;
        }
        Ok(())
    }

    async fn find_api_keys_by_prefix_global(&self, prefix: &str) -> Result<Vec<ApiKey>, AuthError> {
        let models = api_key_entity::Entity::find()
            .filter(api_key_entity::Column::Prefix.eq(prefix))
            .all(&self.db)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(models
            .into_iter()
            .map(|m| ApiKey {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                user_id: m.user_id,
                name: m.name,
                key_hash: m.key_hash,
                prefix: m.prefix,
                scopes: m.scopes,
                last_used_at: m.last_used_at.map(|t| t.into()),
                expires_at: m.expires_at.map(|t| t.into()),
                created_at: m.created_at.into(),
            })
            .collect())
    }

    async fn upsert_permission(
        &self,
        tenant_id: ataqu_kernel::TenantId,
        user_id: Uuid,
        app: String,
        role: String,
    ) -> Result<(), AuthError> {
        use sea_orm::Statement;
        use sea_orm::DbBackend;
        let sql = r#"
            INSERT INTO core.permissions (tenant_id, user_id, app, role, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (tenant_id, user_id, app) DO UPDATE
            SET role = EXCLUDED.role, updated_at = NOW()
        "#;
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![
                tenant_id.as_uuid().into(),
                user_id.into(),
                app.into(),
                role.into(),
            ],
        );
        self.db
            .execute_raw(stmt)
            .await
            .map_err(|e| AuthError::Database(e.to_string()))?;
        Ok(())
    }

}