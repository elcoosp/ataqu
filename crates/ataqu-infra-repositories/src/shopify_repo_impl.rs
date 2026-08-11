use async_trait::async_trait;
use ataqu_domain_shopify::{ShopifyIntegration, ShopifyRepository};
use ataqu_kernel::TenantId;
use ataqu_security::encryption::Encryptor;
use chrono::Utc;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

pub struct ShopifyRepositoryImpl {
    db: DatabaseConnection,
    encryptor: Encryptor,
}

impl ShopifyRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        let encryptor = Encryptor::from_env();
        Self { db, encryptor }
    }
}

#[async_trait]
impl ShopifyRepository for ShopifyRepositoryImpl {
    async fn list_active_integrations(&self) -> Result<Vec<ShopifyIntegration>, String> {
        use crate::entities::shopify as entity;
        let models = entity::Entity::find()
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        let mut ints = Vec::new();
        for m in models {
            ints.push(ShopifyIntegration {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                shop_domain: m.shop_domain,
                access_token: self.encryptor.decrypt(&m.access_token).unwrap_or_default(),
                last_synced_at: m.last_synced_at,
                created_at: m.created_at,
            });
        }
        Ok(ints)
    }

    async fn update_last_synced(
        &self,
        integration_id: Uuid,
        synced_at: chrono::DateTime<Utc>,
    ) -> Result<(), String> {
        use crate::entities::shopify as entity;
        let mut active: entity::ActiveModel = entity::Entity::find_by_id(integration_id)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Integration not found")?
            .into();
        active.last_synced_at = Set(Some(synced_at));
        entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn save_integration(&self, integration: &ShopifyIntegration) -> Result<(), String> {
        use crate::entities::shopify as entity;
        let encryptor = Encryptor::from_env();
        let encrypted_token = encryptor.encrypt(&integration.access_token);
        let active = entity::ActiveModel {
            id: Set(integration.id),
            tenant_id: Set(integration.tenant_id.as_uuid()),
            shop_domain: Set(integration.shop_domain.clone()),
            access_token: Set(encrypted_token),
            last_synced_at: Set(integration.last_synced_at),
            created_at: Set(integration.created_at),
        };
        entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn list_integrations(
        &self,
        tenant_id: &TenantId,
    ) -> Result<Vec<ShopifyIntegration>, String> {
        use crate::entities::shopify as entity;
        let encryptor = Encryptor::from_env();
        let models = entity::Entity::find()
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        let mut ints = Vec::new();
        for m in models {
            let decrypted_token = match encryptor.decrypt(&m.access_token) {
                Ok(token) => token,
                Err(e) => {
                    tracing::error!("Failed to decrypt token for integration {}: {}", m.id, e);
                    "".to_string()
                }
            };
            ints.push(ShopifyIntegration {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                shop_domain: m.shop_domain,
                access_token: decrypted_token,
                last_synced_at: m.last_synced_at,
                created_at: m.created_at,
            });
        }
        Ok(ints)
    }

    async fn delete_integration(&self, integration_id: Uuid) -> Result<(), String> {
        use crate::entities::shopify as entity;
        entity::Entity::delete_by_id(integration_id)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
