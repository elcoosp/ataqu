use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
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
        .create_product(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
) -> ApiResult<Json<Vec<ProductResponse>>> {
    let products = state
        .vault_service
        .list_products(
            auth.tenant_id,
            params.limit.unwrap_or(100),
            params.offset.unwrap_or(0),
        )
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        products.into_iter().map(ProductResponse::from).collect(),
    ))
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

    if let Some(if_none_match) = headers.get(axum::http::header::IF_NONE_MATCH) {
        if if_none_match
            .to_str()
            .map(|s| s == etag.as_str())
            .unwrap_or(false)
        {
            return Ok((StatusCode::NOT_MODIFIED, resp_headers).into_response());
        }
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
        .update_product(cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::vault_service::VaultServiceError::Validation(msg) => {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal(&e.to_string()),
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
        .delete_product(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
        .create_variant(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
) -> ApiResult<Json<Vec<VariantResponse>>> {
    let variants = state
        .vault_service
        .list_variants(
            auth.tenant_id,
            params.limit.unwrap_or(100),
            params.offset.unwrap_or(0),
        )
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        variants.into_iter().map(VariantResponse::from).collect(),
    ))
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

    if let Some(if_none_match) = headers.get(axum::http::header::IF_NONE_MATCH) {
        if if_none_match
            .to_str()
            .map(|s| s == etag.as_str())
            .unwrap_or(false)
        {
            return Ok((StatusCode::NOT_MODIFIED, resp_headers).into_response());
        }
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
        .update_variant(cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::vault_service::VaultServiceError::Validation(msg) => {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal(&e.to_string()),
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
        .delete_variant(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
        .update_stock(cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::vault_service::VaultServiceError::Validation(msg) => {
                ApiResponseError::conflict(&msg)
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(Json(variant.into()))
}

#[derive(Debug, Deserialize)]
pub struct BulkStockAdjustRequest {
    pub adjustments: Vec<(Uuid, i64)>,
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
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
    let variant = state
        .vault_service
        .reserve_stock(auth.tenant_id, id, payload.quantity, if_match)
        .await
        .map_err(|e| match e {
            ataqu_application::vault_service::VaultServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::ETAG,
        format!("\"{}\"", variant.version).parse().unwrap(),
    );
    Ok((
        StatusCode::OK,
        headers,
        Json(VariantResponse::from(variant)),
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
        .create_warehouse(auth.tenant_id, payload.name, payload.location)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
    Json(payload): Json<UpdateWarehouseRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let cmd = UpdateWarehouseCommand {
        tenant_id: auth.tenant_id,
        id,
        name: payload.name,
        location: payload.location,
    };
    let warehouse = state
        .vault_service
        .update_warehouse(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
        .delete_warehouse(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
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
