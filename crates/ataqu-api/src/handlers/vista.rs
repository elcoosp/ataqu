use axum::{
    Router,
    extract::{Path, State},
    response::Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;

#[derive(Debug, Serialize)]
pub struct KpiSummary {
    pub total_events: u64,
    pub total_contacts: u64,
    pub total_deals: u64,
    pub total_deals_won: u64,
    pub total_pipeline_value: rust_decimal::Decimal,
    pub total_revenue: rust_decimal::Decimal,
    pub total_products: u64,
    pub low_stock_variants: u64,
    pub total_bookings: u64,
    pub pending_leave_requests: u64,
    pub last_updated: DateTime<Utc>,
}

pub async fn get_kpis(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<KpiSummary>> {
    let view = state
        .vista_service
        .get_aggregated_view(auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(KpiSummary {
        total_events: view.total_events,
        total_contacts: view.total_contacts,
        total_deals: view.total_deals,
        total_deals_won: view.total_deals_won,
        total_pipeline_value: view.total_pipeline_value,
        total_revenue: view.total_revenue,
        total_products: view.total_products,
        low_stock_variants: view.low_stock_variants,
        total_bookings: view.total_bookings,
        pending_leave_requests: view.pending_leave_requests,
        last_updated: view.last_updated_at.into(),
    }))
}

#[derive(Debug, Deserialize)]
pub struct CreateDashboardRequest {
    pub name: String,
    pub config: serde_json::Value,
}

pub async fn create_dashboard(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateDashboardRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let dashboard = ataqu_domain_vista::Dashboard {
        id: Uuid::now_v7(),
        tenant_id: auth.tenant_id,
        name: payload.name,
        config: payload.config,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    state
        .vista_service
        .save_dashboard(&dashboard)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(serde_json::json!({ "id": dashboard.id })))
}

pub async fn list_dashboards(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let dashboards = state
        .vista_service
        .list_dashboards(auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let resp = dashboards
        .into_iter()
        .map(|d| {
            serde_json::json!({
                "id": d.id,
                "name": d.name,
                "config": d.config,
                "created_at": d.created_at,
                "updated_at": d.updated_at,
            })
        })
        .collect();
    Ok(Json(resp))
}

pub async fn delete_dashboard(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<axum::http::StatusCode> {
    state
        .vista_service
        .delete_dashboard(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct RawSqlRequest {
    pub sql: String,
}

pub async fn execute_raw_sql(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<RawSqlRequest>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    let results = state
        .vista_service
        .execute_raw_sql(auth.tenant_id, &payload.sql)
        .await
        .map_err(|e| match e {
            ataqu_application::vista_service::VistaServiceError::Validation(msg) => ApiResponseError::validation(&msg),
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(Json(results))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/kpis", axum::routing::get(get_kpis))
        .route(
            "/dashboards",
            axum::routing::post(create_dashboard).get(list_dashboards),
        )
        .route("/dashboards/:id", axum::routing::delete(delete_dashboard))
        .route("/raw-sql", axum::routing::post(execute_raw_sql))
}
