use crate::{Result, ShopifyError, RateLimiter};
use crate::models::ShopifyProduct;
use reqwest::Client;

pub struct ShopifyClient {
    client: Client,
    shop_domain: String,
    access_token: String,
    rate_limiter: RateLimiter,
    api_version: String,
}

impl ShopifyClient {
    pub fn new(shop_domain: String, access_token: String) -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap(),
            shop_domain,
            access_token,
            rate_limiter: RateLimiter::new(2),
            api_version: "2024-01".to_string(),
        }
    }

    pub fn with_api_version(mut self, version: String) -> Self {
        self.api_version = version;
        self
    }

    async fn request<T: serde::de::DeserializeOwned>(
        &self,
        method: reqwest::Method,
        path: &str,
        body: Option<serde_json::Value>,
    ) -> Result<T> {
        let _permit = self.rate_limiter.acquire()
            .await
            .map_err(|e| ShopifyError::Other(e))?;

        let url = format!("https://{}/admin/api/{}{}", self.shop_domain, self.api_version, path);
        let mut req = self.client.request(method, &url)
            .header("X-Shopify-Access-Token", &self.access_token)
            .header("Content-Type", "application/json");

        if let Some(body) = body {
            req = req.json(&body);
        }

        let resp = req.send().await?;
        let status = resp.status();
        let headers = resp.headers().clone();

        // Check rate limit headers
        if let Some(limit) = headers.get("x-shopify-shop-api-call-limit") {
            let limit_str = limit.to_str().unwrap_or("");
            if let Some(remaining) = limit_str.split('/').next() {
                if let Ok(remaining) = remaining.parse::<i32>() {
                    if remaining < 5 {
                        tracing::warn!(remaining = remaining, "Shopify API rate limit low");
                    }
                }
            }
        }

        if !status.is_success() {
            // Read body only on error, using a separate variable to avoid moving resp
            let text = resp.text().await.unwrap_or_default();
            if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
                let retry_after = headers
                    .get("retry-after")
                    .and_then(|v| v.to_str().ok())
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(5);
                return Err(ShopifyError::RateLimited(retry_after));
            }
            return Err(ShopifyError::Api(format!("HTTP {}: {}", status, text)));
        }

        let json: T = resp.json().await?;
        Ok(json)
    }

    pub async fn get_products_page(&self, page_info: Option<&str>) -> Result<(Vec<ShopifyProduct>, Option<String>)> {
        let path = if let Some(page_info) = page_info {
            format!("/products.json?limit=250&page_info={}", page_info)
        } else {
            "/products.json?limit=250".to_string()
        };

        let resp: serde_json::Value = self.request(reqwest::Method::GET, &path, None).await?;
        let products: Vec<ShopifyProduct> = serde_json::from_value(resp["products"].clone())?;
        Ok((products, None))
    }

    pub async fn get_inventory_levels(&self, inventory_item_ids: &[i64]) -> Result<Vec<crate::models::ShopifyInventoryLevel>> {
        if inventory_item_ids.is_empty() {
            return Ok(Vec::new());
        }

        let ids_str = inventory_item_ids.iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",");
        let path = format!("/inventory_levels.json?inventory_item_ids={}", ids_str);

        let resp: crate::models::ShopifyInventoryLevelsResponse = self.request(reqwest::Method::GET, &path, None).await?;
        Ok(resp.inventory_levels)
    }

    pub async fn update_inventory(
        &self,
        inventory_item_id: i64,
        location_id: i64,
        quantity: i64,
    ) -> Result<()> {
        let body = serde_json::json!({
            "inventory_item_id": inventory_item_id,
            "location_id": location_id,
            "available": quantity,
        });
        let path = "/inventory_levels/set.json";
        self.request::<serde_json::Value>(reqwest::Method::POST, path, Some(body)).await?;
        Ok(())
    }
}
