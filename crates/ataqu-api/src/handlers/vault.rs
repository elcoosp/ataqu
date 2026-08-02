use axum::{
    Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::{get, post, put},
};
use tracing::instrument;
use uuid::Uuid;

use ataqu_application::vault_service::VaultService;

#[derive(Clone)]
pub struct AppState {
    pub vault_service: VaultService,
}

/// Extracts the `Idempotency-Key` from headers.
pub fn extract_idempotency_key(headers: &HeaderMap) -> Option<Uuid> {
    headers
        .get("idempotency-key")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

/// Extracts the `Tenant-Id` from headers (mocked for now, usually from auth middleware).
pub fn extract_tenant_id(headers: &HeaderMap) -> Uuid {
    headers
        .get("tenant-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(|| Uuid::nil())
}

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

#[instrument(skip(state, headers))]
async fn list_products(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let products = state
        .vault_service
        .list_products(&tenant_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(products))
}

#[instrument(skip(state, headers, payload))]
async fn create_product(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let product = state
        .vault_service
        .create_product(&tenant_id, payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(product))
}

#[instrument(skip(state, headers))]
async fn get_product(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let product = state
        .vault_service
        .get_product(&tenant_id, &id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(product))
}

#[instrument(skip(state, headers, payload))]
async fn update_product(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let product = state
        .vault_service
        .update_product(&tenant_id, &id, payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(product))
}

#[instrument(skip(state, headers))]
async fn list_variants(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let variants = state
        .vault_service
        .list_variants(&tenant_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(variants))
}

#[instrument(skip(state, headers, payload))]
async fn create_variant(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let variant = state
        .vault_service
        .create_variant(&tenant_id, payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(variant))
}

#[instrument(skip(state, headers))]
async fn get_variant(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let variant = state
        .vault_service
        .get_variant(&tenant_id, &id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(variant))
}

#[instrument(skip(state, headers, payload))]
async fn update_variant(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let variant = state
        .vault_service
        .update_variant(&tenant_id, &id, payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(variant))
}

#[instrument(skip(state, headers))]
async fn get_stock(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let stock = state
        .vault_service
        .get_stock(&tenant_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(stock))
}

#[instrument(skip(state, headers, payload))]
async fn update_stock(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let stock = state
        .vault_service
        .update_stock(&tenant_id, payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(stock))
}

#[instrument(skip(state, headers))]
async fn list_movements(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let movements = state
        .vault_service
        .list_movements(&tenant_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(movements))
}

#[instrument(skip(state, headers, payload))]
async fn record_movement(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let movement = state
        .vault_service
        .record_movement(&tenant_id, payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(movement))
}

#[instrument(skip(state, headers))]
async fn list_alerts(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let _idempotency_key = extract_idempotency_key(&headers);
    let tenant_id = extract_tenant_id(&headers);

    let alerts = state
        .vault_service
        .list_alerts(&tenant_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(alerts))
}
