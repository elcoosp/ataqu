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
}

#[derive(Debug, Clone, Serialize)]
pub struct ApiKeyCreated {
    pub id: Uuid,
    pub name: String,
    pub key: String,
    pub prefix: String,
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

    // Generate a random key. In production, use a more secure RNG.
    let raw_key = format!("ataqu_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
    let prefix = raw_key[..12].to_string();

    // Hash the key. In production, use Argon2 or bcrypt.
    // For simplicity here, we'll just use a SHA256 hash or similar.
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(raw_key.as_bytes());
    let _key_hash = format!("{:x}", hasher.finalize());

    Ok(ApiKeyCreated {
        id,
        name: cmd.name,
        key: raw_key,
        prefix,
        created_at: now,
    })
}
