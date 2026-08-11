use async_trait::async_trait;
use ataqu_kernel::TenantId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopifyProduct {
    pub id: i64,
    pub title: String,
    pub body_html: Option<String>,
    pub vendor: Option<String>,
    pub product_type: Option<String>,
    pub handle: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopifyVariant {
    pub id: i64,
    pub product_id: i64,
    pub sku: Option<String>,
    pub title: String,
    pub price: String,
    pub inventory_quantity: i64,
    pub inventory_item_id: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopifyInventoryLevel {
    pub inventory_item_id: i64,
    pub location_id: i64,
    pub available: i64,
    pub updated_at: DateTime<Utc>,
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

pub fn map_shopify_to_vault(
    product: &ShopifyProduct,
    variant: &ShopifyVariant,
    tenant_id: Uuid,
) -> (VaultProduct, VaultVariant) {
    let product_id = Uuid::new_v4();
    let variant_id = Uuid::new_v4();
    let vault_product = VaultProduct {
        id: product_id,
        tenant_id,
        name: product.title.clone(),
        description: product.body_html.clone().unwrap_or_default(),
        sku: variant.sku.clone().unwrap_or_default(),
    };
    let price_cents = (variant.price.parse::<f64>().unwrap_or(0.0) * 100.0) as i64;
    let vault_variant = VaultVariant {
        id: variant_id,
        product_id,
        tenant_id,
        sku: variant.sku.clone().unwrap_or_default(),
        price: price_cents,
        stock_quantity: variant.inventory_quantity,
        reserved_quantity: 0,
        version: 0,
    };
    (vault_product, vault_variant)
}

pub fn calculate_stock_delta(current: i64, new: i64) -> i64 {
    new - current
}

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
    async fn save_integration(&self, integration: &ShopifyIntegration) -> Result<(), String>;
    async fn list_integrations(
        &self,
        tenant_id: &TenantId,
    ) -> Result<Vec<ShopifyIntegration>, String>;
    async fn delete_integration(&self, integration_id: Uuid) -> Result<(), String>;
}
