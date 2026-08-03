use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

use ataqu_application::vault_service::{VaultService, CreateProductCommand, UpdateStockCommand, Product};
use ataqu_kernel::TenantId;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub sku: String,
    pub initial_stock: i64,
}

#[derive(Debug, Serialize)]
pub struct ProductResponse {
    pub id: Uuid,
    pub name: String,
    pub sku: String,
    pub stock: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
impl From<Product> for ProductResponse {
    fn from(p: Product) -> Self {
        Self {
            id: p.id,
            name: p.name,
            sku: p.sku,
            stock: p.stock,
            created_at: p.created_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateStockRequest {
    pub delta: i64,
}

pub async fn create_product(
    State(state): State<AppState>,
    Json(payload): Json<CreateProductRequest>,
) -> Result<(StatusCode, Json<ProductResponse>), StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = CreateProductCommand {
        tenant_id,
        name: payload.name,
        sku: payload.sku,
        initial_stock: payload.initial_stock,
    };
    let product = state.vault_service.create_product(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok((StatusCode::CREATED, Json(product.into())))
}

pub async fn list_products(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProductResponse>>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let products = state.vault_service.list_products(tenant_id).await
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

pub async fn update_stock(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
    Json(payload): Json<UpdateStockRequest>,
) -> Result<Json<ProductResponse>, StatusCode> {
    let tenant_id = TenantId::new(Uuid::new_v4());
    let cmd = UpdateStockCommand {
        tenant_id,
        product_id,
        delta: payload.delta,
    };
    let product = state.vault_service.update_stock(cmd).await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    Ok(Json(product.into()))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/products", axum::routing::post(create_product))
        .route("/products", axum::routing::get(list_products))
        .route("/products/:id", axum::routing::get(get_product))
        .route("/products/:id/stock", axum::routing::put(update_stock))
}
