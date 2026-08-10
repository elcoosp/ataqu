use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopifyProduct {
    pub id: i64,
    pub title: String,
    pub body_html: Option<String>,
    pub vendor: Option<String>,
    pub product_type: Option<String>,
    pub handle: String,
    pub variants: Vec<ShopifyVariant>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopifyProductsResponse {
    pub products: Vec<ShopifyProduct>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopifyInventoryLevelsResponse {
    pub inventory_levels: Vec<ShopifyInventoryLevel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopifyWebhookPayload {
    #[serde(rename = "topic")]
    pub topic: String,
    #[serde(rename = "shop_domain")]
    pub shop_domain: String,
    #[serde(rename = "product")]
    pub product: Option<ShopifyProduct>,
    #[serde(rename = "variant")]
    pub variant: Option<ShopifyVariant>,
}
