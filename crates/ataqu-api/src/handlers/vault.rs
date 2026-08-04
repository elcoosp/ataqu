use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Router,
};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

use ataqu_application::vault_service::{
    CreateProductCommand, CreateVariantCommand, UpdateStockCommand,
};
use crate::AppState;
use crate::middleware::AuthContext;
use crate::error::{ApiResponseError, ApiResult};

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub description: String,
    pub sku: String,
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
    let product = state.vault_service.create_product(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(product.into())))
}

pub async fn list_products(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<ProductResponse>>> {
    let products = state.vault_service.list_products(auth.tenant_id, 100, 0).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(products.into_iter().map(ProductResponse::from).collect()))
}

pub async fn get_product(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<ProductResponse>> {
    let product = state.vault_service.get_product(auth.tenant_id, id).await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(product.into()))
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
    let variant = state.vault_service.create_variant(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(variant.into())))
}

pub async fn list_variants(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<VariantResponse>>> {
    let variants = state.vault_service.list_variants(auth.tenant_id, 100, 0).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(variants.into_iter().map(VariantResponse::from).collect()))
}

pub async fn get_variant(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<VariantResponse>> {
    let variant = state.vault_service.get_variant(auth.tenant_id, id).await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(variant.into()))
}

#[derive(Debug, Deserialize)]
pub struct UpdateStockRequest {
    pub delta: i64,
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
    };
    let variant = state.vault_service.update_stock(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(variant.into()))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/products", axum::routing::post(create_product))
        .route("/products", axum::routing::get(list_products))
        .route("/products/:id", axum::routing::get(get_product))
        .route("/variants", axum::routing::post(create_variant))
        .route("/variants", axum::routing::get(list_variants))
        .route("/variants/:id", axum::routing::get(get_variant))
        .route("/variants/:id/stock", axum::routing::put(update_stock))
}
