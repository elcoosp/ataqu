use async_trait::async_trait;
use ataqu_kernel::TenantId;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct ShopifyIntegration {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub shop_domain: String,
    pub access_token: String,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[async_trait]
pub trait ShopifyRepository: Send + Sync {
    async fn list_active_integrations(&self) -> Result<Vec<ShopifyIntegration>, String>;
    async fn update_last_synced(
        &self,
        integration_id: Uuid,
        synced_at: DateTime<Utc>,
    ) -> Result<(), String>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shopify_integration_creation() {
        let integration = ShopifyIntegration {
            id: Uuid::new_v4(),
            tenant_id: TenantId::new(Uuid::new_v4()),
            shop_domain: "test.myshopify.com".to_string(),
            access_token: "token".to_string(),
            last_synced_at: None,
            created_at: Utc::now(),
        };
        assert_eq!(integration.shop_domain, "test.myshopify.com");
    }
}
