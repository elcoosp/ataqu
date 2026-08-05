use ataqu_kernel::{Clock, IdGenerator, TenantId};
use serde::Serialize;
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct ApiKey {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub user_id: Uuid,
    pub name: String,
    pub key_hash: String,
    pub prefix: String,
    pub scopes: Vec<String>,
    pub last_used_at: Option<SystemTime>,
    pub expires_at: Option<SystemTime>,
    pub created_at: SystemTime,
}

#[derive(Debug, Clone)]
pub struct CreateApiKeyCommand {
    pub tenant_id: TenantId,
    pub user_id: Uuid,
    pub name: String,
    pub expires_at: Option<SystemTime>,
    pub scopes: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApiKeyCreated {
    pub id: Uuid,
    pub name: String,
    pub key: String,
    pub prefix: String,
    pub scopes: Vec<String>,
    pub created_at: SystemTime,
}

pub fn generate_api_key(
    cmd: CreateApiKeyCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<ApiKeyCreated, String> {
    if cmd.name.trim().is_empty() {
        return Err("Name cannot be empty".to_string());
    }

    let id = id_gen.new_uuid_v7();
    let now = clock.now();

    // Generate a random key using injected IdGenerator for deterministic testability
    let raw_key = format!(
        "ataqu_{}",
        id_gen.new_uuid_v7().to_string().replace("-", "")
    );
    let prefix = raw_key[..12].to_string();

    // Hashing is handled by the application layer to avoid domain layer dependencies on crypto details.
    Ok(ApiKeyCreated {
        id,
        name: cmd.name,
        key: raw_key,
        prefix,
        scopes: cmd.scopes,
        created_at: now,
    })
}
