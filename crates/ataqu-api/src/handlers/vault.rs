use axum::{Router, routing::{get, put}};
use crate::AppState;

pub async fn list_products() -> &'static str { "products" }
pub async fn create_product() -> &'static str { "create product" }
pub async fn update_stock() -> &'static str { "update stock" }

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/products", get(list_products).post(create_product))
        .route("/stock", put(update_stock))
}
