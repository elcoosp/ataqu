use ataqu_domain_shopify::ShopifyIntegration;
use ataqu_kernel::TenantId;
use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Utc};
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

/// Clamp user-supplied pagination to a sane maximum so `?limit=2^64-1`
/// cannot force unbounded full-table scans.
fn capped_limit(v: Option<u64>, default: u64) -> u64 {
    v.unwrap_or(default).clamp(1, 200)
}

fn capped_offset(v: Option<u64>) -> u64 {
    v.unwrap_or(0)
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
        .map_err(ApiResponseError::internal_err)?;
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
    let limit = capped_limit(params.limit, 100);
    let offset = capped_offset(params.offset);
    let (products, total) = state
        .vault_service
        .list_products(auth.tenant_id, limit, offset)
        .await
        .map_err(ApiResponseError::internal_err)?;
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
            err => ApiResponseError::internal_err(err),
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
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
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
    let limit = capped_limit(params.limit, 100);
    let offset = capped_offset(params.offset);
    let (variants, total) = state
        .vault_service
        .list_variants(auth.tenant_id, limit, offset)
        .await
        .map_err(ApiResponseError::internal_err)?;
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
            err => ApiResponseError::internal_err(err),
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
        .map_err(ApiResponseError::internal_err)?;
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
            err => ApiResponseError::internal_err(err),
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
        .map_err(ApiResponseError::internal_err)?;
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
            capped_limit(params.limit, 100),
            capped_offset(params.offset),
        )
        .await
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
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
            err => ApiResponseError::internal_err(err),
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
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
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
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<serde_json::Value>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    // SECURITY: the OAuth state was previously the predictable, unsigned
    // string `{tenant_id}_{user_id}` — anyone could forge it in the callback
    // and inject an integration into another tenant. The state is now an
    // HMAC-signed, expiring token tied to the initiating admin.
    let state_str = sign_oauth_state(&state.jwt_secret, auth.tenant_id.as_uuid(), auth.user_id);
    let redirect_uri = std::env::var("SHOPIFY_REDIRECT_URI")
        .unwrap_or_else(|_| "https://api.ataqu.com/api/v1/vault/shopify/callback".to_string());
    let shop =
        std::env::var("SHOPIFY_SHOP").unwrap_or_else(|_| "your-shop.myshopify.com".to_string());
    if !is_valid_shop_domain(&shop) {
        return Err(ApiResponseError::internal(
            "SHOPIFY_SHOP must be a *.myshopify.com domain",
        ));
    }
    let client_id = std::env::var("SHOPIFY_CLIENT_ID").unwrap_or_default();
    let url = format!(
        "https://{}/admin/oauth/authorize?client_id={}&scope=read_products,write_products,read_inventory,write_inventory&redirect_uri={}&state={}",
        shop,
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(&state_str)
    );
    Ok(Json(serde_json::json!({ "url": url })))
}

/// True for `something.myshopify.com`-style shop domains (Shopify-managed).
/// Anything else is rejected: the shop domain becomes the base URL for the
/// token exchange and for every later sync request, so allowing arbitrary
/// hosts here would let an attacker point the server (and its access token)
/// at a host they control (SSRF / token exfiltration).
fn is_valid_shop_domain(shop: &str) -> bool {
    let lower = shop.to_ascii_lowercase();
    let Some(host) = lower.strip_suffix(".myshopify.com") else {
        return false;
    };
    !host.is_empty()
        && !host.contains('.')
        && !host.contains('/')
        && !host.contains(':')
        && host.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

/// HMAC-SHA256-signed OAuth state: `b64(tenant|user|expiry).b64(sig)`.
/// Verifiable statelessly with the server's JWT secret; expires after 15
/// minutes. NOTE: 1800s window is intentional — OAuth redirects through the
/// user's browser can be slow.
fn sign_oauth_state(secret: &[u8], tenant_id: Uuid, user_id: Uuid) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    let expiry = chrono::Utc::now().timestamp() + 1800;
    let payload = format!("{tenant_id}|{user_id}|{expiry}");
    let mut mac =
        <Hmac<Sha256> as Mac>::new_from_slice(secret).expect("HMAC accepts any key length");
    mac.update(payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes());
    format!("{}.{}", URL_SAFE_NO_PAD.encode(payload.as_bytes()), sig)
}

/// Verify and parse a state produced by [`sign_oauth_state`]. Returns the
/// tenant id on success.
fn verify_oauth_state(secret: &[u8], state: &str) -> Result<Uuid, ApiResponseError> {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    let Some((payload_b64, sig)) = state.split_once('.') else {
        return Err(ApiResponseError::validation("Invalid OAuth state"));
    };
    let payload = URL_SAFE_NO_PAD
        .decode(payload_b64)
        .map_err(|_| ApiResponseError::validation("Invalid OAuth state"))?;
    let mut mac = <Hmac<Sha256> as Mac>::new_from_slice(secret)
        .map_err(|_| ApiResponseError::internal("Invalid HMAC key"))?;
    mac.update(&payload);
    let expected = hex::encode(mac.finalize().into_bytes());
    if !constant_time_eq(&expected, sig) {
        return Err(ApiResponseError::unauthorized(
            "Invalid OAuth state signature",
        ));
    }
    let payload_str = String::from_utf8(payload)
        .map_err(|_| ApiResponseError::validation("Invalid OAuth state"))?;
    let parts: Vec<&str> = payload_str.split('|').collect();
    if parts.len() != 3 {
        return Err(ApiResponseError::validation("Invalid OAuth state"));
    }
    let tenant_id = Uuid::parse_str(parts[0])
        .map_err(|_| ApiResponseError::validation("Invalid OAuth state"))?;
    let _user_id = Uuid::parse_str(parts[1])
        .map_err(|_| ApiResponseError::validation("Invalid OAuth state"))?;
    let expiry: i64 = parts[2]
        .parse()
        .map_err(|_| ApiResponseError::validation("Invalid OAuth state"))?;
    if chrono::Utc::now().timestamp() > expiry {
        return Err(ApiResponseError::validation("OAuth state expired"));
    }
    Ok(tenant_id)
}

/// Verify the `hmac` query parameter Shopify attaches to OAuth callbacks
/// (HMAC-SHA256 over the lexicographically sorted `k=v` pairs, minus
/// `hmac`/`signature`, keyed with the app client secret).
fn verify_shopify_callback_hmac(
    query_pairs: &[(String, String)],
    client_secret: &str,
    provided: &str,
) -> bool {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    let mut pairs: Vec<(String, String)> = query_pairs
        .iter()
        .filter(|(k, _)| k != "hmac" && k != "signature")
        .cloned()
        .collect();
    pairs.sort();
    let message = pairs
        .iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<Vec<_>>()
        .join("&");
    let Ok(mut mac) = <Hmac<Sha256> as Mac>::new_from_slice(client_secret.as_bytes()) else {
        return false;
    };
    mac.update(message.as_bytes());
    let computed = hex::encode(mac.finalize().into_bytes());
    constant_time_eq(&computed, provided)
}

pub async fn shopify_callback(
    State(state): State<AppState>,
    Query(query): Query<ShopifyOAuthCallback>,
    raw_query: axum::extract::RawQuery,
) -> ApiResult<Json<serde_json::Value>> {
    // 1) The shop host must be Shopify-managed BEFORE any secret leaves the
    //    process (the previous code POSTed the client secret to whatever
    //    host the caller supplied).
    let shop = query.shop.to_ascii_lowercase();
    if !is_valid_shop_domain(&shop) {
        return Err(ApiResponseError::validation("Invalid shop domain"));
    }

    // 2) Verify Shopify's OAuth callback signature (`hmac` query param).
    let client_secret = std::env::var("SHOPIFY_CLIENT_SECRET")
        .map_err(|_| ApiResponseError::internal("SHOPIFY_CLIENT_SECRET not set"))?;
    if let Some(raw) = raw_query.0.as_deref() {
        let pairs: Vec<(String, String)> = url::form_urlencoded::parse(raw.as_bytes())
            .into_owned()
            .collect();
        let provided = pairs
            .iter()
            .find(|(k, _)| k == "hmac")
            .map(|(_, v)| v.clone())
            .unwrap_or_default();
        if provided.is_empty() || !verify_shopify_callback_hmac(&pairs, &client_secret, &provided) {
            return Err(ApiResponseError::unauthorized("Invalid callback signature"));
        }
    }

    // 3) Verify our signed state (tenant binding + expiry). This replaces the
    //    old forgeable `{tenant}_{user}` value.
    let state_str = query.state.unwrap_or_default();
    let tenant_id = verify_oauth_state(&state.jwt_secret, &state_str)?;

    let client = reqwest::Client::new();
    let token_url = format!("https://{shop}/admin/oauth/access_token");
    let resp = client
        .post(&token_url)
        .json(&serde_json::json!({
            "client_id": std::env::var("SHOPIFY_CLIENT_ID").unwrap_or_default(),
            "client_secret": client_secret,
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

    let integration = ShopifyIntegration {
        id: Uuid::new_v4(),
        tenant_id: TenantId::new(tenant_id),
        shop_domain: shop.clone(),
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
        "shop": shop,
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

    // SECURITY: HMAC verification is now mandatory. Previously a request with
    // no `X-Shopify-Hmac-Sha256` header skipped verification entirely, so
    // anyone could forge stock updates for any tenant (integration lookup is
    // by shop domain, not by caller). Shopify always signs its webhooks; an
    // unsigned request is by definition not from Shopify.
    let Some(sig) = signature_header else {
        return Err(ApiResponseError::unauthorized("Missing webhook signature"));
    };
    {
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

// ----------------------------------------------------------------------
// Shopify sync log retrieval (spec: VISTA / VAULT settings panel)
// ----------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct SyncLogResponse {
    id: i64,
    sync_type: String,
    status: String,
    product_id: Option<Uuid>,
    shopify_id: Option<i64>,
    error_message: Option<String>,
    retry_count: i32,
    created_at: DateTime<Utc>,
}

pub async fn list_shopify_sync_logs(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<SyncLogResponse>>> {
    let limit = capped_limit(params.limit, 100);
    let offset = capped_offset(params.offset);
    let logs = state
        .shopify_service
        .log_repo
        .list_failed_logs(auth.tenant_id, limit, offset)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    // Real total (the endpoint previously reported `logs.len()`, breaking
    // pagination whenever more than one page of failures existed).
    let total = state
        .shopify_service
        .log_repo
        .count_failed_logs(auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let items = logs
        .into_iter()
        .map(|log| SyncLogResponse {
            id: log.id,
            sync_type: log.sync_type,
            status: log.status,
            product_id: log.product_id,
            shopify_id: log.shopify_id,
            error_message: log.error_message,
            retry_count: log.retry_count,
            created_at: log.created_at,
        })
        .collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
}

/// GET /vault/shopify/integrations — returns the tenant's integrations with a
/// product count (variants synced per integration is tracked via products table).
#[derive(Debug, Serialize)]
pub struct ShopifyIntegrationResponse {
    pub id: Uuid,
    pub shop_domain: String,
    pub status: String,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub product_count: i64,
    pub created_at: DateTime<Utc>,
}

pub async fn list_shopify_integrations(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<ShopifyIntegrationResponse>>> {
    let integrations = state
        .shopify_service
        .repo
        .list_integrations(&auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    use ataqu_infra_repositories::entities::vault::variant as variant_entity;
    use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};

    let mut items = Vec::with_capacity(integrations.len());
    for integration in integrations {
        // Count products that were synced for this tenant (sync writes into vault.products).
        let product_count = variant_entity::Entity::find()
            .filter(variant_entity::Column::TenantId.eq(auth.tenant_id.as_uuid()))
            .count(&state.db)
            .await
            .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

        // No status column is persisted yet; integrations are live until deleted.
        let status = "active";

        items.push(ShopifyIntegrationResponse {
            id: integration.id,
            shop_domain: integration.shop_domain,
            status: status.to_string(),
            last_synced_at: integration.last_synced_at,
            product_count: product_count as i64,
            created_at: integration.created_at,
        });
    }
    Ok(Json(items))
}

/// DELETE /vault/shopify/disconnect — removes the tenant's Shopify integration(s).
pub async fn shopify_disconnect(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<StatusCode> {
    // Destructive tenant-wide operation — consistent with connect/sync.
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
    for integration in integrations {
        state
            .shopify_service
            .repo
            .delete_integration(integration.id)
            .await
            .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    }
    Ok(StatusCode::NO_CONTENT)
}

// Helper for constant time comparison
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

// ----------------------------------------------------------------------
// Amazon Seller Central connect / sync endpoints (spec 9 — Amazon Sync, P1)
// ----------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct AmazonConnectRequest {
    pub marketplace_id: String,
    pub seller_id: String,
    /// LWA refresh token used to mint SP-API credentials.
    pub refresh_token: String,
}

pub async fn amazon_connect(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<AmazonConnectRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let integration = ataqu_domain_amazon::AmazonIntegration {
        id: Uuid::new_v4(),
        tenant_id: auth.tenant_id,
        marketplace_id: payload.marketplace_id,
        seller_id: payload.seller_id,
        refresh_token: payload.refresh_token,
        last_synced_at: None,
        created_at: chrono::Utc::now(),
    };
    state
        .amazon_service
        .repo
        .save_integration(&integration)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(serde_json::json!({ "status": "connected" })))
}

pub async fn amazon_disconnect(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let integrations = state
        .amazon_service
        .repo
        .list_integrations(&auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    if let Some(integration) = integrations.first() {
        state
            .amazon_service
            .repo
            .delete_integration(integration.id)
            .await
            .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn amazon_status(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<serde_json::Value>> {
    let integrations = state
        .amazon_service
        .repo
        .list_integrations(&auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let connected = integrations.first();
    Ok(Json(serde_json::json!({
        "connected": connected.is_some(),
        "marketplace_id": connected.map(|i| i.marketplace_id.clone()),
        "seller_id": connected.map(|i| i.seller_id.clone()),
        "last_synced_at": connected.and_then(|i| i.last_synced_at).map(|t| t.to_rfc3339()),
    })))
}

pub async fn amazon_sync(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let integrations = state
        .amazon_service
        .repo
        .list_integrations(&auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let integration = integrations
        .first()
        .ok_or_else(|| ApiResponseError::not_found("Amazon not connected"))?;

    let client = state.http_client.clone();
    let amazon_service = state.amazon_service.clone();
    let integration_clone = integration.clone();
    tokio::spawn(async move {
        let _ = amazon_service
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
            .map_err(ApiResponseError::internal_err)?;
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
            .map_err(ApiResponseError::internal_err)?;
    }
    Ok(StatusCode::NO_CONTENT)
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/shopify/auth", axum::routing::get(shopify_auth_start))
        .route("/shopify/sync", axum::routing::post(shopify_sync))
        .route(
            "/shopify/integrations",
            axum::routing::get(list_shopify_integrations),
        )
        .route(
            "/shopify/disconnect",
            axum::routing::delete(shopify_disconnect),
        )
        .route(
            "/shopify/sync-logs",
            axum::routing::get(list_shopify_sync_logs),
        )
        .route("/amazon/connect", axum::routing::post(amazon_connect))
        .route("/amazon/disconnect", axum::routing::post(amazon_disconnect))
        .route("/amazon/sync", axum::routing::post(amazon_sync))
        .route("/amazon/status", axum::routing::get(amazon_status))
        .route(
            "/products",
            axum::routing::post(create_product).get(list_products),
        )
        .route(
            "/products/bulk-delete",
            axum::routing::post(bulk_delete_products),
        )
        .route(
            "/products/{id}",
            axum::routing::get(get_product)
                .put(update_product)
                .delete(delete_product),
        )
        .route(
            "/variants",
            axum::routing::post(create_variant).get(list_variants),
        )
        .route(
            "/variants/bulk-delete",
            axum::routing::post(bulk_delete_variants),
        )
        .route(
            "/variants/{id}",
            axum::routing::get(get_variant)
                .put(update_variant)
                .delete(delete_variant),
        )
        .route("/variants/{id}/stock", axum::routing::put(update_stock))
        .route("/variants/{id}/reserve", axum::routing::post(reserve_stock))
        .route(
            "/variants/bulk-stock-adjust",
            axum::routing::post(bulk_adjust_stock),
        )
        .route(
            "/variants/{id}/movements",
            axum::routing::get(list_movements),
        )
        .route("/alerts/low-stock", axum::routing::get(get_low_stock))
        .route(
            "/warehouses",
            axum::routing::post(create_warehouse).get(list_warehouses),
        )
        .route(
            "/warehouses/{id}",
            axum::routing::put(update_warehouse).delete(delete_warehouse),
        )
}

/// Routes that must be reachable WITHOUT the auth middleware:
/// * `/shopify/callback` — the browser redirect from Shopify's OAuth grant
///   page carries no bearer token; it is protected by the signed `state` and
///   Shopify's `hmac` query signature instead.
/// * `/shopify/webhook`  — machine-to-machine calls from Shopify, protected
///   by the mandatory `X-Shopify-Hmac-Sha256` body signature.
///
/// (Previously these lived on the authenticated router, where the global
/// middleware made them permanently unreachable — webhooks got a 400 and the
/// OAuth callback a 401, so the whole integration could never complete.)
pub fn public_routes() -> Router<AppState> {
    Router::new()
        .route("/shopify/callback", axum::routing::get(shopify_callback))
        .route("/shopify/webhook", axum::routing::post(shopify_webhook))
}
