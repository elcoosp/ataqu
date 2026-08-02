use axum::{
    Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::{get, post, put},
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/products", get(list_products).post(create_product))
        .route("/products/:id", get(get_product).put(update_product))
        .route("/variants", get(list_variants).post(create_variant))
        .route("/variants/:id", get(get_variant).put(update_variant))
        .route("/stock", get(get_stock).put(update_stock))
        .route("/movements", get(list_movements).post(record_movement))
        .route("/alerts", get(list_alerts))
}

async fn list_products() -> Json<Vec<Value>> { Json(vec![]) }
async fn create_product() -> Json<Value> { Json(json!({})) }
async fn get_product() -> Json<Value> { Json(json!({})) }
async fn update_product() -> Json<Value> { Json(json!({})) }
async fn list_variants() -> Json<Vec<Value>> { Json(vec![]) }
async fn create_variant() -> Json<Value> { Json(json!({})) }
async fn get_variant() -> Json<Value> { Json(json!({})) }
async fn update_variant() -> Json<Value> { Json(json!({})) }
async fn get_stock() -> Json<Value> { Json(json!({})) }
async fn update_stock() -> Json<Value> { Json(json!({})) }
async fn list_movements() -> Json<Vec<Value>> { Json(vec![]) }
async fn record_movement() -> Json<Value> { Json(json!({})) }
async fn list_alerts() -> Json<Vec<Value>> { Json(vec![]) }
