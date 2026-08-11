use crate::vault_service::VaultService;
use ataqu_domain_shopify::{ShopifyIntegration, ShopifyRepository};
use ataqu_infra_repositories::shopify_sync_log_repo::ShopifySyncLogRepo;
use ataqu_kernel::TenantId;
use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

pub struct ShopifyService {
    pub repo: Arc<dyn ShopifyRepository + Send + Sync>,
    pub vault_service: Arc<VaultService>,
    pub log_repo: Arc<ShopifySyncLogRepo>,
}

impl ShopifyService {
    pub fn new(
        repo: Arc<dyn ShopifyRepository + Send + Sync>,
        vault_service: Arc<VaultService>,
        log_repo: Arc<ShopifySyncLogRepo>,
    ) -> Self {
        Self {
            repo,
            vault_service,
            log_repo,
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
        let tenant_id = TenantId::new(integration.tenant_id.as_uuid());
        let log_id = self.log_repo.log_sync_start(tenant_id, "inventory_sync")
            .await
            .unwrap_or(0);

        let mut page_url = format!(
            "https://{}/admin/api/2024-01/products.json?limit=250",
            integration.shop_domain
        );

        let retry_count = 0;

        loop {
            let resp = client
                .get(&page_url)
                .header("X-Shopify-Access-Token", &integration.access_token)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !resp.status().is_success() {
                let error_msg = format!("Shopify API error: {}", resp.status());
                if let Err(e) = self.log_repo.log_sync_error(log_id, &error_msg, retry_count + 1).await {
                    tracing::error!("Failed to log sync error: {}", e);
                }
                return Err(error_msg);
            }

            let link_header_value = resp.headers().get("link").cloned();
            let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            if let Some(products) = body.get("products").and_then(|p| p.as_array()) {
                for product in products {
                    if let Some(variants) = product.get("variants").and_then(|v| v.as_array()) {
                        for variant in variants {
                            let sku = variant.get("sku").and_then(|s| s.as_str());
                            let inventory =
                                variant.get("inventory_quantity").and_then(|i| i.as_i64());
                            let shopify_id = variant.get("id").and_then(|i| i.as_i64());

                            if let (Some(sku), Some(inv)) = (sku, inventory) {
                                match self
                                    .vault_service
                                    .find_variant_by_sku(tenant_id, sku.to_string())
                                    .await
                                {
                                    Ok(Some(vault_variant)) => {
                                        let delta = inv - vault_variant.stock_quantity;
                                        if delta != 0 {
                                            if let Err(e) = self
                                                .vault_service
                                                .update_stock(
                                                    uuid::Uuid::nil(),
                                                    crate::vault_service::UpdateStockCommand {
                                                        tenant_id,
                                                        variant_id: vault_variant.id,
                                                        delta,
                                                        reason: "shopify_sync".to_string(),
                                                        reference: Some(format!(
                                                            "shopify_sync_{}",
                                                            Uuid::new_v4()
                                                        )),
                                                        alert_channel_id: None,
                                                        expected_version: vault_variant.version,
                                                    },
                                                )
                                                .await
                                            {
                                                tracing::error!(error = %e, sku = %sku, "Failed to update VAULT stock from Shopify");
                                                if let Err(log_err) = self.log_repo.log_sync_error(
                                                    log_id,
                                                    &format!("Stock update failed for SKU {}: {}", sku, e),
                                                    retry_count + 1,
                                                ).await {
                                                    tracing::error!("Failed to log error: {}", log_err);
                                                }
                                            } else {
                                                tracing::info!(sku = %sku, delta = %delta, "Updated VAULT inventory from Shopify");
                                                if let Err(log_err) = self.log_repo.log_sync_success(
                                                    log_id,
                                                    Some(vault_variant.id),
                                                    shopify_id,
                                                ).await {
                                                    tracing::error!("Failed to log success: {}", log_err);
                                                }
                                            }
                                        }
                                    }
                                    Ok(None) => {
                                        tracing::warn!(sku = %sku, "Variant not found in VAULT for Shopify sync");
                                    }
                                    Err(e) => {
                                        tracing::error!(error = %e, sku = %sku, "Error finding variant in VAULT for Shopify sync");
                                        if let Err(log_err) = self.log_repo.log_sync_error(
                                            log_id,
                                            &format!("Variant lookup failed for SKU {}: {}", sku, e),
                                            retry_count + 1,
                                        ).await {
                                            tracing::error!("Failed to log error: {}", log_err);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Check for next page link
            if let Some(link_header) = link_header_value.as_ref()
                && let Ok(link_str) = link_header.to_str()
            {
                if let Some(next) = link_str.split(',').find(|s| s.contains("rel=\"next\""))
                    && let Some(url_start) = next.find('<')
                {
                    let url_end = next.find('>').unwrap_or(next.len());
                    page_url = next[url_start + 1..url_end].to_string();
                    continue;
                }
            }
            break;
        }

        self.repo
            .update_last_synced(integration.id, Utc::now())
            .await?;
        Ok(())
    }
}
