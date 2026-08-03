use axum::{
    Router,
    routing::{get, post, put},
};
use crate::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/products", get(list_products).post(create_product))
        .route("/products/:id", get(get_product).put(update_product))
        .route("/variants", get(list_variants).post(create_variant))
        .route("/variants/:id", get(get_variant).put(update_variant))
        .route("/stock", get(get_stock).put(update_stock))
        .route("/movements", get(list_movements).post(record_movement))
        .route("/alerts", get(list_alerts))
}

async fn list_products() -> axum::Json<Vec<serde_json::Value>> { axum::Json(vec![]) }
async fn create_product() -> axum::Json<serde_json::Value> { axum::Json(serde_json::json!({})) }
async fn get_product() -> axum::Json<serde_json::Value> { axum::Json(serde_json::json!({})) }
async fn update_product() -> axum::Json<serde_json::Value> { axum::Json(serde_json::json!({})) }
async fn list_variants() -> axum::Json<Vec<serde_json::Value>> { axum::Json(vec![]) }
async fn create_variant() -> axum::Json<serde_json::Value> { axum::Json(serde_json::json!({})) }
async fn get_variant() -> axum::Json<serde_json::Value> { axum::Json(serde_json::json!({})) }
async fn update_variant() -> axum::Json<serde_json::Value> { axum::Json(serde_json::json!({})) }
async fn get_stock() -> axum::Json<serde_json::Value> { axum::Json(serde_json::json!({})) }
async fn update_stock() -> axum::Json<serde_json::Value> { axum::Json(serde_json::json!({})) }
async fn list_movements() -> axum::Json<Vec<serde_json::Value>> { axum::Json(vec![]) }
async fn record_movement() -> axum::Json<serde_json::Value> { axum::Json(serde_json::json!({})) }
async fn list_alerts() -> axum::Json<Vec<serde_json::Value>> { axum::Json(vec![]) }
