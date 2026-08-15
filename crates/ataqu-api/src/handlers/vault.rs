use ataqu_domain_shopify::ShopifyIntegration;
use ataqu_kernel::TenantId;
use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use chrono::{DateTime, Utc};
// use hmac::Mac; // removed, not used
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_application::vault_service::{
    BulkStockAdjustCommand, CreateProductCommand, CreateVariantCommand, UpdateProductCommand,
    UpdateStockCommand, UpdateVariantCommand, UpdateWarehouseCommand,
};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub description: String,
    pub sku: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub sku: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProductResponse {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub sku: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
}

impl From<ataqu_application::vault_service::Product> for ProductResponse {
    fn from(p: ataqu_application::vault_service::Product) -> Self {
        Self {
            id: p.id,
            name: p.name,
            description: p.description,
            sku: p.sku,
            created_at: p.created_at.into(),
            updated_at: p.updated_at.into(),
            version: p.version,
        }
    }
}

pub async fn create_product(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateProductRequest>,
) -> ApiResult<impl IntoResponse> {
    let cmd = CreateProductCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        description: payload.description,
        sku: payload.sku,
    };
    let product = state
        .vault_service
        .create_product(auth.user_id, cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", product.version).parse().unwrap(),
    );
    Ok((
        StatusCode::CREATED,
        headers,
        Json(ProductResponse::from(product)),
    ))
}

pub async fn list_products(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<ProductResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let (products, total) = state
        .vault_service
        .list_products(auth.tenant_id, limit, offset)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let items = products.into_iter().map(ProductResponse::from).collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
}

pub async fn get_product(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResult<axum::response::Response> {
    let product = state
        .vault_service
        .get_product(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    let etag = format!("\"{}\"", product.version);
    let mut resp_headers = axum::http::HeaderMap::new();
    resp_headers.insert(axum::http::header::ETAG, etag.parse().unwrap());

    if let Some(if_none_match) = headers.get(axum::http::header::IF_NONE_MATCH)
        && if_none_match
            .to_str()
            .map(|s| s == etag.as_str())
            .unwrap_or(false)
    {
        return Ok((StatusCode::NOT_MODIFIED, resp_headers).into_response());
    }
    Ok((
        StatusCode::OK,
        resp_headers,
        Json(ProductResponse::from(product)),
    )
        .into_response())
}

pub async fn update_product(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateProductRequest>,
) -> ApiResult<Json<ProductResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    let cmd = UpdateProductCommand {
        tenant_id: auth.tenant_id,
        id,
        name: payload.name,
        description: payload.description,
        sku: payload.sku,
        expected_version: if_match,
    };
    let product = state
        .vault_service
        .update_product(auth.user_id, cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::vault_service::VaultServiceError::Validation(msg) => {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(Json(product.into()))
}

pub async fn delete_product(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .vault_service
        .delete_product(auth.user_id, auth.tenant_id, id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct CreateVariantRequest {
    pub product_id: Uuid,
    pub sku: String,
    pub initial_stock: i64,
    pub price: i64,
}

#[derive(Debug, Serialize)]
pub struct VariantResponse {
    pub id: Uuid,
    pub product_id: Uuid,
    pub sku: String,
    pub price: i64,
    pub stock_quantity: i64,
    pub reserved_quantity: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
}

impl From<ataqu_application::vault_service::Variant> for VariantResponse {
    fn from(v: ataqu_application::vault_service::Variant) -> Self {
        Self {
            id: v.id,
            product_id: v.product_id,
            sku: v.sku,
            price: v.price,
            stock_quantity: v.stock_quantity,
            reserved_quantity: v.reserved_quantity,
            created_at: v.created_at.into(),
            updated_at: v.updated_at.into(),
            version: v.version,
        }
    }
}

pub async fn create_variant(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateVariantRequest>,
) -> ApiResult<impl IntoResponse> {
    let cmd = CreateVariantCommand {
        tenant_id: auth.tenant_id,
        product_id: payload.product_id,
        sku: payload.sku,
        initial_stock: payload.initial_stock,
        price: payload.price,
    };
    let variant = state
        .vault_service
        .create_variant(auth.user_id, cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", variant.version).parse().unwrap(),
    );
    Ok((
        StatusCode::CREATED,
        headers,
        Json(VariantResponse::from(variant)),
    ))
}

pub async fn list_variants(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<VariantResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let (variants, total) = state
        .vault_service
        .list_variants(auth.tenant_id, limit, offset)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let items = variants.into_iter().map(VariantResponse::from).collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
}

pub async fn get_variant(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> ApiResult<axum::response::Response> {
    let variant = state
        .vault_service
        .get_variant(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    let etag = format!("\"{}\"", variant.version);
    let mut resp_headers = axum::http::HeaderMap::new();
    resp_headers.insert(axum::http::header::ETAG, etag.parse().unwrap());

    if let Some(if_none_match) = headers.get(axum::http::header::IF_NONE_MATCH)
        && if_none_match
            .to_str()
            .map(|s| s == etag.as_str())
            .unwrap_or(false)
    {
        return Ok((StatusCode::NOT_MODIFIED, resp_headers).into_response());
    }
    Ok((
        StatusCode::OK,
        resp_headers,
        Json(VariantResponse::from(variant)),
    )
        .into_response())
}

#[derive(Debug, Deserialize)]
pub struct UpdateVariantRequest {
    pub price: Option<i64>,
    pub sku: Option<String>,
}

pub async fn update_variant(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateVariantRequest>,
) -> ApiResult<Json<VariantResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    let cmd = UpdateVariantCommand {
        tenant_id: auth.tenant_id,
        id,
        price: payload.price,
        sku: payload.sku,
        expected_version: if_match,
    };
    let variant = state
        .vault_service
        .update_variant(auth.user_id, cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::vault_service::VaultServiceError::Validation(msg) => {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(Json(variant.into()))
}

pub async fn delete_variant(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .vault_service
        .delete_variant(auth.user_id, auth.tenant_id, id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct UpdateStockRequest {
    pub delta: i64,
    pub reason: String,
    pub reference: Option<String>,
    pub alert_channel_id: Option<Uuid>,
}

pub async fn update_stock(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(variant_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateStockRequest>,
) -> ApiResult<Json<VariantResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;

    let cmd = UpdateStockCommand {
        tenant_id: auth.tenant_id,
        variant_id,
        delta: payload.delta,
        reason: payload.reason,
        reference: payload.reference,
        alert_channel_id: payload.alert_channel_id,
        expected_version: if_match,
    };
    let variant = state
        .vault_service
        .update_stock(auth.user_id, cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::vault_service::VaultServiceError::Validation(msg) => {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(Json(variant.into()))
}

#[derive(Debug, Deserialize)]
pub struct BulkStockAdjustRequest {
    pub adjustments: Vec<(Uuid, i64, i32)>,
    pub reason: String,
}

pub async fn bulk_adjust_stock(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<BulkStockAdjustRequest>,
) -> ApiResult<Json<Vec<VariantResponse>>> {
    let cmd = BulkStockAdjustCommand {
        tenant_id: auth.tenant_id,
        adjustments: payload.adjustments,
        reason: payload.reason,
    };
    let variants = state
        .vault_service
        .bulk_adjust_stock(cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(
        variants.into_iter().map(VariantResponse::from).collect(),
    ))
}

pub async fn list_movements(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(variant_id): Path<Uuid>,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let movements = state
        .vault_service
        .list_movements(
            auth.tenant_id,
            variant_id,
            params.limit.unwrap_or(100),
            params.offset.unwrap_or(0),
        )
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let list: Vec<_> = movements
        .iter()
        .map(|m| {
            serde_json::json!({
                "id": m.id,
                "variant_id": m.variant_id,
                "quantity": m.quantity,
                "reason": m.reason,
                "reference": m.reference,
                "timestamp": m.timestamp,
            })
        })
        .collect();
    Ok(Json(list))
}

#[derive(Debug, Deserialize)]
pub struct LowStockParams {
    #[serde(default = "default_threshold")]
    pub threshold: i64,
}

fn default_threshold() -> i64 {
    5
}

pub async fn get_low_stock(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<LowStockParams>,
) -> ApiResult<Json<Vec<VariantResponse>>> {
    let variants = state
        .vault_service
        .find_low_stock_variants(auth.tenant_id, params.threshold)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(
        variants.into_iter().map(VariantResponse::from).collect(),
    ))
}

#[derive(Debug, Deserialize)]
pub struct ReserveStockRequest {
    pub quantity: i64,
}

pub async fn reserve_stock(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<ReserveStockRequest>,
) -> ApiResult<impl IntoResponse> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;
    let (variant, reservation) = state
        .vault_service
        .reserve_stock(auth.user_id, auth.tenant_id, id, payload.quantity, if_match)
        .await
        .map_err(|e| match e {
            ataqu_application::vault_service::VaultServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", variant.version).parse().unwrap(),
    );
    Ok((
        StatusCode::OK,
        headers,
        Json(serde_json::json!({
            "variant": VariantResponse::from(variant),
            "reservation_id": reservation.id
        })),
    ))
}

#[derive(Debug, Deserialize)]
pub struct CreateWarehouseRequest {
    pub name: String,
    pub location: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWarehouseRequest {
    pub name: Option<String>,
    pub location: Option<Option<String>>,
}

pub async fn create_warehouse(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateWarehouseRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let warehouse = state
        .vault_service
        .create_warehouse(auth.user_id, auth.tenant_id, payload.name, payload.location)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(serde_json::json!({ "id": warehouse.id })))
}

pub async fn list_warehouses(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let warehouses = state
        .vault_service
        .list_warehouses(auth.tenant_id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    let list = warehouses
        .iter()
        .map(|w| {
            serde_json::json!({
                "id": w.id,
                "name": w.name,
                "location": w.location,
            })
        })
        .collect();
    Ok(Json(list))
}

pub async fn update_warehouse(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateWarehouseRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;
    let cmd = UpdateWarehouseCommand {
        tenant_id: auth.tenant_id,
        id,
        name: payload.name,
        location: payload.location,
        expected_version: if_match,
    };
    let warehouse = state
        .vault_service
        .update_warehouse(auth.user_id, cmd)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(Json(serde_json::json!({
        "id": warehouse.id,
        "name": warehouse.name,
        "location": warehouse.location,
    })))
}

pub async fn delete_warehouse(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .vault_service
        .delete_warehouse(auth.user_id, auth.tenant_id, id)
        .await
        .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    Ok(StatusCode::NO_CONTENT)
}

// ----------------------------------------------------------------------
// Shopify OAuth and Webhook endpoints
// ----------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct ShopifyOAuthCallback {
    pub code: String,
    pub shop: String,
    pub state: Option<String>,
}

pub async fn shopify_auth_start(
    State(_state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<serde_json::Value>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let state_str = format!("{}_{}", auth.tenant_id.as_uuid(), auth.user_id);
    let redirect_uri = std::env::var("SHOPIFY_REDIRECT_URI")
        .unwrap_or_else(|_| "https://api.ataqu.com/api/v1/vault/shopify/callback".to_string());
    let shop =
        std::env::var("SHOPIFY_SHOP").unwrap_or_else(|_| "your-shop.myshopify.com".to_string());
    let client_id = std::env::var("SHOPIFY_CLIENT_ID").unwrap_or_default();
    let url = format!(
        "https://{}/admin/oauth/authorize?client_id={}&scope=read_products,write_products,read_inventory,write_inventory&redirect_uri={}&state={}",
        shop,
        client_id,
        urlencoding::encode(&redirect_uri),
        state_str
    );
    Ok(Json(serde_json::json!({ "url": url })))
}

pub async fn shopify_callback(
    State(state): State<AppState>,
    Query(query): Query<ShopifyOAuthCallback>,
) -> ApiResult<Json<serde_json::Value>> {
    let client = reqwest::Client::new();
    let token_url = format!("https://{}/admin/oauth/access_token", query.shop);
    let resp = client
        .post(&token_url)
        .json(&serde_json::json!({
            "client_id": std::env::var("SHOPIFY_CLIENT_ID").unwrap_or_default(),
            "client_secret": std::env::var("SHOPIFY_CLIENT_SECRET").unwrap_or_default(),
            "code": query.code,
        }))
        .send()
        .await
        .map_err(|_| ApiResponseError::internal("Failed to exchange code"))?;
    let token_data: serde_json::Value = resp
        .json()
        .await
        .map_err(|_| ApiResponseError::internal("Invalid token response"))?;
    let access_token = token_data["access_token"]
        .as_str()
        .ok_or_else(|| ApiResponseError::internal("Missing access token"))?;

    // Parse state to get tenant_id
    let state_str = query.state.unwrap_or_default();
    let state_parts: Vec<&str> = state_str.split('_').collect();
    if state_parts.is_empty() {
        return Err(ApiResponseError::validation("Invalid state"));
    }
    let tenant_id = Uuid::parse_str(state_parts[0])
        .map_err(|_| ApiResponseError::validation("Invalid tenant"))?;

    let integration = ShopifyIntegration {
        id: Uuid::new_v4(),
        tenant_id: TenantId::new(tenant_id),
        shop_domain: query.shop.clone(),
        access_token: access_token.to_string(),
        last_synced_at: None,
        created_at: chrono::Utc::now(),
    };

    state
        .shopify_service
        .repo
        .save_integration(&integration)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok(Json(serde_json::json!({
        "status": "connected",
        "shop": query.shop,
        "message": "Shopify integration saved successfully"
    })))
}

pub async fn shopify_webhook(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    body: String, // raw body as string
) -> ApiResult<StatusCode> {
    let topic = headers
        .get("X-Shopify-Topic")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let shop_domain = headers
        .get("X-Shopify-Shop-Domain")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let signature_header = headers
        .get("X-Shopify-Hmac-Sha256")
        .and_then(|v| v.to_str().ok());

    if topic.is_empty() || shop_domain.is_empty() {
        return Ok(StatusCode::BAD_REQUEST);
    }

    // Find integration by shop_domain
    let integrations = state
        .shopify_service
        .repo
        .list_active_integrations()
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let integration = integrations
        .iter()
        .find(|i| i.shop_domain == shop_domain)
        .ok_or_else(|| ApiResponseError::not_found("Shopify integration not found"))?;

    // Verify HMAC signature if header present – use app client secret
    if let Some(sig) = signature_header {
        use sha2::{Sha256, digest::Mac};
        let client_secret = std::env::var("SHOPIFY_CLIENT_SECRET")
            .map_err(|_| ApiResponseError::internal("SHOPIFY_CLIENT_SECRET not set"))?;
        let mut mac = <hmac::Hmac<Sha256> as hmac::Mac>::new_from_slice(client_secret.as_bytes())
            .map_err(|_| ApiResponseError::internal("Invalid HMAC key"))?;
        mac.update(body.as_bytes());
        let computed = hex::encode(mac.finalize().into_bytes());
        if !constant_time_eq(&computed, sig) {
            return Err(ApiResponseError::unauthorized("Invalid webhook signature"));
        }
    }

    let payload: serde_json::Value = serde_json::from_str(&body)
        .map_err(|_| ApiResponseError::validation("Invalid JSON payload"))?;

    // Handle topics
    match topic {
        "inventory_levels/update" => {
            // Extract inventory_item_id and available quantity
            if let (Some(_inventory_item_id), Some(available)) = (
                payload.get("inventory_item_id").and_then(|v| v.as_i64()),
                payload.get("available").and_then(|v| v.as_i64()),
            ) {
                // Find variant by inventory_item_id - we need a mapping table.
                // For simplicity, we'll rely on the SKU that is sent in the payload.
                // Actually Shopify sends the inventory_item_id, but we don't store it.
                // We'll add a query to find the variant by SKU from the product.
                // Since the webhook payload may not contain SKU, we'll find the variant by
                // looking up the product and variant IDs from Shopify.
                // For MVP, we'll skip if we can't find the variant.
                let sku = payload.get("sku").and_then(|v| v.as_str());
                if let Some(sku) = sku
                    && let Ok(Some(variant)) = state
                        .vault_service
                        .find_variant_by_sku(
                            ataqu_kernel::TenantId::new(integration.tenant_id.as_uuid()),
                            sku.to_string(),
                        )
                        .await
                {
                    let delta = available - variant.stock_quantity;
                    if delta != 0 {
                        let _ = state
                            .vault_service
                            .update_stock(
                                Uuid::nil(),
                                ataqu_application::vault_service::UpdateStockCommand {
                                    tenant_id: ataqu_kernel::TenantId::new(
                                        integration.tenant_id.as_uuid(),
                                    ),
                                    variant_id: variant.id,
                                    delta,
                                    reason: "shopify_webhook".to_string(),
                                    reference: Some(format!("webhook_{}", uuid::Uuid::new_v4())),
                                    alert_channel_id: None,
                                    expected_version: variant.version,
                                },
                            )
                            .await;
                    }
                }
            }
        }
        "products/update" | "products/create" => {
            // For product updates, we could sync product metadata.
            // For MVP, we just log and ignore (inventory is handled via inventory_levels).
            tracing::info!("Product webhook received for shop: {}", shop_domain);
        }
        _ => {
            tracing::debug!("Unhandled webhook topic: {}", topic);
        }
    }

    Ok(StatusCode::OK)
}

// Helper for constant time comparison
fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.bytes()
        .zip(b.bytes())
        .fold(0, |acc, (x, y)| acc | (x ^ y))
        == 0
}

pub async fn shopify_sync(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let integrations = state
        .shopify_service
        .repo
        .list_integrations(&auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let integration = integrations
        .first()
        .ok_or_else(|| ApiResponseError::not_found("Shopify not connected"))?;

    let client = state.http_client.clone();
    let shopify_service = state.shopify_service.clone();
    let integration_clone = integration.clone();
    tokio::spawn(async move {
        let _ = shopify_service
            .sync_tenant_inventory(&integration_clone, &client)
            .await;
    });

    Ok(StatusCode::ACCEPTED)
}

#[derive(Debug, serde::Deserialize)]
pub struct BulkDeleteIdsRequest {
    pub ids: Vec<Uuid>,
}

pub async fn bulk_delete_products(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<BulkDeleteIdsRequest>,
) -> ApiResult<StatusCode> {
    for id in payload.ids {
        state
            .vault_service
            .delete_product(auth.user_id, auth.tenant_id, id)
            .await
            .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn bulk_delete_variants(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<BulkDeleteIdsRequest>,
) -> ApiResult<StatusCode> {
    for id in payload.ids {
        state
            .vault_service
            .delete_variant(auth.user_id, auth.tenant_id, id)
            .await
            .map_err(|_| ApiResponseError::internal("An unexpected error occurred"))?;
    }
    Ok(StatusCode::NO_CONTENT)
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/shopify/auth", axum::routing::get(shopify_auth_start))
        .route("/shopify/callback", axum::routing::get(shopify_callback))
        .route("/shopify/webhook", axum::routing::post(shopify_webhook))
        .route("/shopify/sync", axum::routing::post(shopify_sync))
        .route(
            "/products",
            axum::routing::post(create_product).get(list_products),
        )
        .route(
            "/products/:id",
            axum::routing::get(get_product)
                .put(update_product)
                .delete(delete_product),
        )
        .route(
            "/variants",
            axum::routing::post(create_variant).get(list_variants),
        )
        .route(
            "/variants/:id",
            axum::routing::get(get_variant)
                .put(update_variant)
                .delete(delete_variant),
        )
        .route("/variants/:id/stock", axum::routing::put(update_stock))
        .route("/variants/:id/reserve", axum::routing::post(reserve_stock))
        .route(
            "/variants/bulk-stock-adjust",
            axum::routing::post(bulk_adjust_stock),
        )
        .route(
            "/variants/:id/movements",
            axum::routing::get(list_movements),
        )
        .route("/alerts/low-stock", axum::routing::get(get_low_stock))
        .route(
            "/warehouses",
            axum::routing::post(create_warehouse).get(list_warehouses),
        )
        .route(
            "/warehouses/:id",
            axum::routing::put(update_warehouse).delete(delete_warehouse),
        )
}
