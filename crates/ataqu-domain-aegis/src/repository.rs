use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::net::IpAddr;
use uuid::Uuid;

use ataqu_kernel::TenantId;
use ataqu_security::Email;

use crate::User;
use crate::api_key::ApiKey;

#[async_trait]
pub trait AuthRepository: Send + Sync {
    async fn save_user(&self, user: &User) -> Result<(), crate::AuthError>;
    async fn find_by_email(
        &self,
        email: &Email,
        tenant_id: Option<TenantId>,
    ) -> Result<Option<User>, crate::AuthError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, crate::AuthError>;
    async fn list_users(&self, tenant_id: Uuid) -> Result<Vec<User>, crate::AuthError>;
    async fn list_tenants(&self) -> Result<Vec<Uuid>, crate::AuthError>;
    async fn save_api_key(&self, key: &ApiKey) -> Result<(), crate::AuthError>;
    async fn list_api_keys(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<ApiKey>, crate::AuthError>;
    async fn delete_api_key(&self, tenant_id: Uuid, id: Uuid) -> Result<(), crate::AuthError>;
    async fn find_api_keys_by_prefix_global(
        &self,
        prefix: &str,
    ) -> Result<Vec<ApiKey>, crate::AuthError>;
    async fn update_api_key_last_used(
        &self,
        id: Uuid,
        now: std::time::SystemTime,
    ) -> Result<(), crate::AuthError>;

    async fn upsert_permission(
        &self,
        tenant_id: ataqu_kernel::TenantId,
        user_id: Uuid,
        app: String,
        role: String,
    ) -> Result<(), crate::AuthError>;
}

#[derive(Debug, Clone)]
pub struct AuditLogEntry {
    pub id: i64,
    pub tenant_id: TenantId,
    pub user_id: Uuid,
    pub action: String,
    pub app: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub old_value: Option<JsonValue>,
    pub new_value: Option<JsonValue>,
    pub ip_address: Option<IpAddr>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct PermissionEntry {
    pub user_id: Uuid,
    pub user_name: Option<String>,
    pub user_email: String,
    pub role_per_app: HashMap<String, String>, // app -> role
}

#[async_trait]
pub trait AuditRepositoryTrait: Send + Sync {
    #[allow(clippy::too_many_arguments)]
    async fn append_log(
        &self,
        tenant_id: TenantId,
        user_id: Uuid,
        action: &str,
        app: &str,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
        old_value: Option<JsonValue>,
        new_value: Option<JsonValue>,
        ip_address: Option<IpAddr>,
        user_agent: Option<&str>,
    ) -> Result<(), String>;

    #[allow(clippy::too_many_arguments)]
    async fn list_logs(
        &self,
        tenant_id: TenantId,
        limit: i64,
        offset: i64,
        action_filter: Option<&str>,
        app_filter: Option<&str>,
        from_date: Option<DateTime<Utc>>,
        to_date: Option<DateTime<Utc>>,
    ) -> Result<Vec<AuditLogEntry>, String>;

    async fn get_permission_matrix(
        &self,
        tenant_id: TenantId,
    ) -> Result<Vec<PermissionEntry>, String>;
}
