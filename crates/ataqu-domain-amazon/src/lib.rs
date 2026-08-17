//! Amazon Seller Central integration domain (spec 9 — VAULT Amazon Sync, P1).
//!
//! Mirrors `ataqu_domain_shopify` but models the simpler MLP scope: a seller
//! connects via stored SP-API credentials and Ataqu polls inventory levels,
//! syncing stock into VAULT by SKU (same approach as Shopify).

use async_trait::async_trait;
use ataqu_kernel::TenantId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmazonProduct {
    pub asin: String,
    pub sku: String,
    pub title: String,
    pub quantity: i64,
}

#[derive(Debug, Clone)]
pub struct VaultProduct {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: String,
    pub sku: String,
}

#[derive(Debug, Clone)]
pub struct VaultVariant {
    pub id: Uuid,
    pub product_id: Uuid,
    pub tenant_id: Uuid,
    pub sku: String,
    pub price: i64,
    pub stock_quantity: i64,
    pub reserved_quantity: i64,
    pub version: i32,
}

pub fn calculate_stock_delta(current: i64, new: i64) -> i64 {
    new - current
}

#[derive(Debug, Clone)]
pub struct AmazonIntegration {
    pub id: Uuid,
    pub tenant_id: TenantId,
    /// Seller marketplace id, e.g. "ATVPDKIKX0DER" (US).
    pub marketplace_id: String,
    /// Seller identifier.
    pub seller_id: String,
    /// Encrypted LWA refresh token used to mint SP-API credentials.
    pub refresh_token: String,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[async_trait]
pub trait AmazonRepository: Send + Sync {
    async fn list_active_integrations(&self) -> Result<Vec<AmazonIntegration>, String>;
    async fn update_last_synced(
        &self,
        integration_id: Uuid,
        synced_at: DateTime<Utc>,
    ) -> Result<(), String>;
    async fn save_integration(&self, integration: &AmazonIntegration) -> Result<(), String>;
    async fn list_integrations(
        &self,
        tenant_id: &TenantId,
    ) -> Result<Vec<AmazonIntegration>, String>;
    async fn delete_integration(&self, integration_id: Uuid) -> Result<(), String>;
}
