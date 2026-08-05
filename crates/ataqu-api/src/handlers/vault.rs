use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_application::vault_service::{
    CreateProductCommand, CreateVariantCommand, UpdateProductCommand, UpdateStockCommand,
};

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
    pub id: String,
    pub name: String,
    pub description: String,
    pub sku: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<ataqu_application::vault_service::Product> for ProductResponse {
    fn from(p: ataqu_application::vault_service::Product) -> Self {
        Self {
            id: p.id.to_string(),
            name: p.name,
            description: p.description,
            sku: p.sku,
            created_at: p.created_at.into(),
            updated_at: p.updated_at.into(),
        }
    }
}

pub async fn create_product(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateProductRequest>,
) -> ApiResult<(StatusCode, Json<ProductResponse>)> {
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
    Ok((StatusCode::CREATED, Json(product.into())))
}

pub async fn list_products(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<ProductResponse>>> {
    let products = state
        .vault_service
        .list_products(auth.tenant_id, 100, 0)
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
) -> ApiResult<Json<ProductResponse>> {
    let product = state
        .vault_service
        .get_product(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(product.into()))
}

pub async fn update_product(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateProductRequest>,
) -> ApiResult<Json<ProductResponse>> {
    let cmd = UpdateProductCommand {
        tenant_id: auth.tenant_id,
        id,
        name: payload.name,
        description: payload.description,
        sku: payload.sku,
    };
    let product = state
        .vault_service
        .update_product(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
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
    pub id: String,
    pub product_id: String,
    pub sku: String,
    pub price: i64,
    pub stock_quantity: i64,
    pub reserved_quantity: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<ataqu_application::vault_service::Variant> for VariantResponse {
    fn from(v: ataqu_application::vault_service::Variant) -> Self {
        Self {
            id: v.id.to_string(),
            product_id: v.product_id.to_string(),
            sku: v.sku,
            price: v.price,
            stock_quantity: v.stock_quantity,
            reserved_quantity: v.reserved_quantity,
            created_at: v.created_at.into(),
            updated_at: v.updated_at.into(),
        }
    }
}

pub async fn create_variant(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateVariantRequest>,
) -> ApiResult<(StatusCode, Json<VariantResponse>)> {
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
    Ok((StatusCode::CREATED, Json(variant.into())))
}

pub async fn list_variants(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<VariantResponse>>> {
    let variants = state
        .vault_service
        .list_variants(auth.tenant_id, 100, 0)
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
) -> ApiResult<Json<VariantResponse>> {
    let variant = state
        .vault_service
        .get_variant(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(variant.into()))
}

#[derive(Debug, Deserialize)]
pub struct UpdateStockRequest {
    pub delta: i64,
    pub reason: String,
    pub reference: Option<String>,
}

pub async fn update_stock(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(variant_id): Path<Uuid>,
    Json(payload): Json<UpdateStockRequest>,
) -> ApiResult<Json<VariantResponse>> {
    let cmd = UpdateStockCommand {
        tenant_id: auth.tenant_id,
        variant_id,
        delta: payload.delta,
        reason: payload.reason,
        reference: payload.reference,
    };
    let variant = state
        .vault_service
        .update_stock(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(variant.into()))
}

pub async fn list_movements(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(variant_id): Path<Uuid>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let movements = state
        .vault_service
        .list_movements(auth.tenant_id, variant_id, 100, 0)
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
        .route("/variants/:id", axum::routing::get(get_variant))
        .route("/variants/:id/stock", axum::routing::put(update_stock))
        .route(
            "/variants/:id/movements",
            axum::routing::get(list_movements),
        )
        .route("/alerts/low-stock", axum::routing::get(get_low_stock))
        .route(
            "/warehouses",
            axum::routing::post(create_warehouse).get(list_warehouses),
        )
}

#[derive(Debug, Deserialize)]
pub struct CreateWarehouseRequest {
    pub name: String,
    pub location: Option<String>,
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
