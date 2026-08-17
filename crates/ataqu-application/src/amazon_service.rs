use crate::vault_service::VaultService;
use ataqu_domain_amazon::{AmazonIntegration, AmazonRepository};
use ataqu_infra_repositories::amazon_sync_log_repo::AmazonSyncLogRepo;
use ataqu_kernel::TenantId;
use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

pub struct AmazonService {
    pub repo: Arc<dyn AmazonRepository + Send + Sync>,
    pub vault_service: Arc<VaultService>,
    pub log_repo: Arc<AmazonSyncLogRepo>,
}

impl AmazonService {
    pub fn new(
        repo: Arc<dyn AmazonRepository + Send + Sync>,
        vault_service: Arc<VaultService>,
        log_repo: Arc<AmazonSyncLogRepo>,
    ) -> Self {
        Self {
            repo,
            vault_service,
            log_repo,
        }
    }

    /// Poll every active Amazon integration and reconcile stock into VAULT by SKU.
    pub async fn sync_all(&self, client: &reqwest::Client) {
        let integrations = match self.repo.list_active_integrations().await {
            Ok(ints) => ints,
            Err(e) => {
                tracing::error!("Failed to list active Amazon integrations: {}", e);
                return;
            }
        };

        for integration in integrations {
            if let Err(e) = self.sync_tenant_inventory(&integration, client).await {
                tracing::error!(integration_id = %integration.id, error = %e, "Failed to sync tenant Amazon inventory");
            }
        }
    }

    pub async fn sync_tenant_inventory(
        &self,
        integration: &AmazonIntegration,
        client: &reqwest::Client,
    ) -> Result<(), String> {
        let tenant_id = TenantId::new(integration.tenant_id.as_uuid());
        let log_id = self
            .log_repo
            .log_sync_start(tenant_id, "inventory_sync")
            .await
            .unwrap_or(0);

        // Mint an SP-API access token from the stored LWA refresh token.
        let access_token = match self
            .exchange_lwa_token(client, &integration.refresh_token)
            .await
        {
            Ok(t) => t,
            Err(e) => {
                let _ = self.log_repo.log_sync_error(log_id, &e, 1).await;
                return Err(e);
            }
        };

        // Page through Amazon FBA inventory summaries.
        let mut next_token: Option<String> = None;
        let mut synced = 0u32;
        loop {
            let mut url = format!(
                "https://sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?marketplaceIds={}&details=true",
                integration.marketplace_id
            );
            if let Some(token) = next_token.clone() {
                url.push_str(&format!("&nextToken={}", token));
            }

            let resp = client
                .get(&url)
                .header("x-amz-access-token", &access_token)
                .header("Content-Type", "application/json")
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !resp.status().is_success() {
                let error_msg = format!("Amazon SP-API error: {}", resp.status());
                let _ = self.log_repo.log_sync_error(log_id, &error_msg, 1).await;
                return Err(error_msg);
            }

            let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            if let Some(items) = body.get("inventorySummaries").and_then(|i| i.as_array()) {
                for item in items {
                    let sku = item.get("sellerSku").and_then(|s| s.as_str());
                    let qty = item
                        .get("totalQuantity")
                        .and_then(|q| q.as_i64())
                        .or_else(|| {
                            item.get("inventoryDetails")
                                .and_then(|d| d.get("fulfillableQuantity"))
                                .and_then(|q| q.as_i64())
                        });
                    if let (Some(sku), Some(quantity)) = (sku, qty) {
                        if let Err(e) = self.reconcile_sku(tenant_id, sku, quantity, log_id).await {
                            tracing::error!(sku = %sku, error = %e, "Failed to reconcile Amazon SKU");
                        } else {
                            synced += 1;
                        }
                    }
                }
            }

            next_token = body
                .get("pagination")
                .and_then(|p| p.get("nextToken"))
                .and_then(|t| t.as_str())
                .map(|s| s.to_string());
            if next_token.is_none() {
                break;
            }
        }

        let _ = self.log_repo.log_sync_success(log_id, None, None).await;
        tracing::info!(synced, "Reconciled Amazon inventory into VAULT");
        self.repo
            .update_last_synced(integration.id, Utc::now())
            .await?;
        Ok(())
    }

    async fn reconcile_sku(
        &self,
        tenant_id: TenantId,
        sku: &str,
        quantity: i64,
        log_id: i64,
    ) -> Result<(), String> {
        match self
            .vault_service
            .find_variant_by_sku(tenant_id, sku.to_string())
            .await
        {
            Ok(Some(variant)) => {
                let delta = quantity - variant.stock_quantity;
                if delta != 0 {
                    self.vault_service
                        .update_stock(
                            Uuid::nil(),
                            crate::vault_service::UpdateStockCommand {
                                tenant_id,
                                variant_id: variant.id,
                                delta,
                                reason: "amazon_sync".to_string(),
                                reference: Some(format!("amazon_sync_{}", Uuid::new_v4())),
                                alert_channel_id: None,
                                expected_version: variant.version,
                            },
                        )
                        .await
                        .map_err(|e| e.to_string())?;
                }
                let _ = self.log_repo.log_sync_success(log_id, Some(variant.id), None).await;
                Ok(())
            }
            Ok(None) => {
                tracing::warn!(sku = %sku, "Variant not found in VAULT for Amazon sync");
                Ok(())
            }
            Err(e) => Err(e.to_string()),
        }
    }

    async fn exchange_lwa_token(
        &self,
        client: &reqwest::Client,
        refresh_token: &str,
    ) -> Result<String, String> {
        let client_id = std::env::var("AMAZON_LWA_CLIENT_ID").unwrap_or_default();
        let client_secret = std::env::var("AMAZON_LWA_CLIENT_SECRET").unwrap_or_default();
        let resp = client
            .post("https://api.amazon.com/auth/o2/token")
            .form(&[
                ("grant_type", "refresh_token"),
                ("refresh_token", refresh_token),
                ("client_id", &client_id),
                ("client_secret", &client_secret),
            ])
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        data.get("access_token")
            .and_then(|t| t.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| "Missing Amazon access token".to_string())
    }
}
