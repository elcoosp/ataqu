use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

use ataqu_application::vault_service::{
    VaultService, CreateProductCommand, CreateVariantCommand, UpdateStockCommand,
};
use ataqu_kernel::TenantId;
use crate::AppState;

// ---------- Product DTOs ----------
#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct ProductResponse {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
impl From<ataqu_application::vault_service::Product> for ProductResponse {
    fn from(p: ataqu_application::vault_service::Product) -> Self {
        Self {
            id: p.id,
            name: p.name,
            description: p.description,
            created_at: p.created_at.into(),
            updated_at: p.updated_at.into(),
        }
    }
}

pub async fn create_product(
    State(state): State<AppState>,
    Json(payload): Json<CreateProductRequest>,
) -> Result<(StatusCode, Json<ProductResponse>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = CreateProductCommand {
        tenant_id,
        name: payload.name,
        description: payload.description,
    };
    let product = state.vault_service.create_product(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(product.into())))
}

pub async fn list_products(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProductResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let products = state.vault_service.list_products(tenant_id, 100, 0).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(products.into_iter().map(|p| p.into()).collect()))
}

pub async fn get_product(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ProductResponse>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let product = state.vault_service.get_product(tenant_id, id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(product.into()))
}

// ---------- Variant DTOs ----------
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
            id: v.id,
            product_id: v.product_id,
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
    Json(payload): Json<CreateVariantRequest>,
) -> Result<(StatusCode, Json<VariantResponse>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = CreateVariantCommand {
        tenant_id,
        product_id: payload.product_id,
        sku: payload.sku,
        initial_stock: payload.initial_stock,
        price: payload.price,
    };
    let variant = state.vault_service.create_variant(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(variant.into())))
}

pub async fn list_variants(
    State(state): State<AppState>,
) -> Result<Json<Vec<VariantResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let variants = state.vault_service.list_variants(tenant_id, 100, 0).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(variants.into_iter().map(|v| v.into()).collect()))
}

pub async fn get_variant(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<VariantResponse>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let variant = state.vault_service.get_variant(tenant_id, id).await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(Json(variant.into()))
}

#[derive(Debug, Deserialize)]
pub struct UpdateStockRequest {
    pub delta: i64,
}

pub async fn update_stock(
    State(state): State<AppState>,
    Path(variant_id): Path<Uuid>,
    Json(payload): Json<UpdateStockRequest>,
) -> Result<Json<VariantResponse>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = UpdateStockCommand {
        tenant_id,
        variant_id,
        delta: payload.delta,
    };
    let variant = state.vault_service.update_stock(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(variant.into()))
}

// ---------- Router ----------
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
