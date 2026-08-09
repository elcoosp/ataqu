use crate::vault_service::VaultService;
use ataqu_domain_vault::shopify::{ShopifyIntegration, ShopifyRepository};
use ataqu_kernel::TenantId;
use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

pub struct ShopifyService {
    pub repo: Arc<dyn ShopifyRepository + Send + Sync>,
    pub vault_service: Arc<VaultService>,
}

impl ShopifyService {
    pub fn new(
        repo: Arc<dyn ShopifyRepository + Send + Sync>,
        vault_service: Arc<VaultService>,
    ) -> Self {
        Self {
            repo,
            vault_service,
        }
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
                            let tenant_id = TenantId::new(integration.tenant_id.as_uuid());
                            match self
                                .vault_service
                                .find_variant_by_sku(tenant_id, sku.to_string())
                                .await
                            {
                                Ok(Some(variant)) => {
                                    let delta = inv - variant.stock_quantity;
                                    if delta != 0 {
                                        if let Err(e) = self
                                            .vault_service
                                            .update_stock(
                                                crate::vault_service::UpdateStockCommand {
                                                    tenant_id,
                                                    variant_id: variant.id,
                                                    delta,
                                                    reason: "shopify_sync".to_string(),
                                                    reference: Some(format!(
                                                        "shopify_sync_{}",
                                                        Uuid::new_v4()
                                                    )),
                                                    alert_channel_id: None,
                                                    expected_version: variant.version,
                                                },
                                            )
                                            .await
                                        {
                                            tracing::error!(error = %e, sku = %sku, "Failed to update VAULT stock from Shopify");
                                        } else {
                                            tracing::info!(sku = %sku, delta = %delta, "Updated VAULT inventory from Shopify");
                                        }
                                    }
                                }
                                Ok(None) => {
                                    tracing::warn!(sku = %sku, "Variant not found in VAULT for Shopify sync");
                                }
                                Err(e) => {
                                    tracing::error!(error = %e, sku = %sku, "Error finding variant in VAULT for Shopify sync");
                                }
                            }
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
