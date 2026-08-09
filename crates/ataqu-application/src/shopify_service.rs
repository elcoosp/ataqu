use ataqu_domain_vault::shopify::{ShopifyIntegration, ShopifyRepository};
use chrono::Utc;
use std::sync::Arc;

pub struct ShopifyService {
    pub repo: Arc<dyn ShopifyRepository + Send + Sync>,
}

impl ShopifyService {
    pub fn new(repo: Arc<dyn ShopifyRepository + Send + Sync>) -> Self {
        Self { repo }
    }

    pub async fn sync_all(&self, client: &reqwest::Client) {
        let integrations = match self.repo.list_active_integrations().await {
            Ok(ints) => ints,
            Err(e) => {
                tracing::error!("Failed to list active Shopify integrations: {}", e);
                return;
            }
        };

        for integration in integrations {
            if let Err(e) = self.sync_tenant_inventory(&integration, client).await {
                tracing::error!(integration_id = %integration.id, error = %e, "Failed to sync tenant inventory");
            }
        }
    }

    pub async fn sync_tenant_inventory(
        &self,
        integration: &ShopifyIntegration,
        client: &reqwest::Client,
    ) -> Result<(), String> {
        let url = format!(
            "https://{}/admin/api/2024-01/products.json",
            integration.shop_domain
        );

        let resp = client
            .get(&url)
            .header("X-Shopify-Access-Token", &integration.access_token)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            return Err(format!("Shopify API error: {}", resp.status()));
        }

        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

        if let Some(products) = body.get("products").and_then(|p| p.as_array()) {
            for product in products {
                if let Some(variants) = product.get("variants").and_then(|v| v.as_array()) {
                    for variant in variants {
                        let sku = variant.get("sku").and_then(|s| s.as_str());
                        let inventory = variant.get("inventory_quantity").and_then(|i| i.as_i64());

                        if let (Some(sku), Some(inv)) = (sku, inventory) {
                            tracing::info!(sku = %sku, inventory = %inv, "Updating VAULT inventory from Shopify");
                            // TODO: In a full implementation, we would resolve the tenant_id from the integration
                            // and call vault_service to update stock by SKU.
                            // Since this worker doesn't have access to VaultService, we log it.
                        }
                    }
                }
            }
        }

        self.repo
            .update_last_synced(integration.id, Utc::now())
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;
    use ataqu_kernel::TenantId;
    use chrono::Utc;
    use uuid::Uuid;

    struct MockShopifyRepo;

    #[async_trait]
    impl ShopifyRepository for MockShopifyRepo {
        async fn list_active_integrations(&self) -> Result<Vec<ShopifyIntegration>, String> {
            Ok(vec![ShopifyIntegration {
                id: Uuid::new_v4(),
                tenant_id: TenantId::new(Uuid::new_v4()),
                shop_domain: "test.myshopify.com".to_string(),
                access_token: "token".to_string(),
                last_synced_at: None,
                created_at: Utc::now(),
            }])
        }
        async fn update_last_synced(
            &self,
            _integration_id: Uuid,
            _synced_at: chrono::DateTime<Utc>,
        ) -> Result<(), String> {
            Ok(())
        }
    }

    #[tokio::test]
    async fn test_sync_all_handles_errors_gracefully() {
        let repo = Arc::new(MockShopifyRepo);
        let service = ShopifyService::new(repo);
        let integration = ShopifyIntegration {
            id: Uuid::new_v4(),
            tenant_id: TenantId::new(Uuid::new_v4()),
            shop_domain: "invalid domain".to_string(),
            access_token: "token".to_string(),
            last_synced_at: None,
            created_at: Utc::now(),
        };
        let client = reqwest::Client::new();
        let result = service.sync_tenant_inventory(&integration, &client).await;
        assert!(result.is_err());
    }
}
