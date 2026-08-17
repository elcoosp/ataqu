//! Repository implementation for Amazon integrations.
use async_trait::async_trait;
use ataqu_domain_amazon::{AmazonIntegration, AmazonRepository};
use ataqu_kernel::TenantId;
use ataqu_security::encryption::Encryptor;
use chrono::Utc;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter, Set};
use uuid::Uuid;

pub struct AmazonRepositoryImpl {
    db: DatabaseConnection,
    encryptor: Encryptor,
}

impl AmazonRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Result<Self, String> {
        let encryptor = Encryptor::from_env()?;
        Ok(Self { db, encryptor })
    }
}

#[async_trait]
impl AmazonRepository for AmazonRepositoryImpl {
    async fn list_active_integrations(&self) -> Result<Vec<AmazonIntegration>, String> {
        use crate::entities::amazon as entity;
        let models = entity::Entity::find()
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        let mut ints = Vec::new();
        for m in models {
            ints.push(AmazonIntegration {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                marketplace_id: m.marketplace_id,
                seller_id: m.seller_id,
                refresh_token: self.encryptor.decrypt(&m.refresh_token).unwrap_or_default(),
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
        use crate::entities::amazon as entity;
        let model = entity::Entity::find_by_id(integration_id)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Amazon integration not found")?;
        let mut active = model.into_active_model();
        active.last_synced_at = Set(Some(synced_at));
        entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn save_integration(&self, integration: &AmazonIntegration) -> Result<(), String> {
        use crate::entities::amazon as entity;
        let encrypted = self.encryptor.encrypt(&integration.refresh_token);
        let active = entity::ActiveModel {
            id: Set(integration.id),
            tenant_id: Set(integration.tenant_id.as_uuid()),
            marketplace_id: Set(integration.marketplace_id.clone()),
            seller_id: Set(integration.seller_id.clone()),
            refresh_token: Set(encrypted),
            last_synced_at: Set(integration.last_synced_at),
            created_at: Set(integration.created_at),
            ..Default::default()
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
    ) -> Result<Vec<AmazonIntegration>, String> {
        use crate::entities::amazon as entity;
        let models = entity::Entity::find()
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        let mut ints = Vec::new();
        for m in models {
            ints.push(AmazonIntegration {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                marketplace_id: m.marketplace_id,
                seller_id: m.seller_id,
                refresh_token: self.encryptor.decrypt(&m.refresh_token).unwrap_or_default(),
                last_synced_at: m.last_synced_at,
                created_at: m.created_at,
            });
        }
        Ok(ints)
    }

    async fn delete_integration(&self, integration_id: Uuid) -> Result<(), String> {
        use crate::entities::amazon as entity;
        entity::Entity::delete_by_id(integration_id)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
