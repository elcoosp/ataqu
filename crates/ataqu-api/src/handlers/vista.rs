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
        .map_err(ApiResponseError::internal_err)?;
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
    let dashboard = state
        .vista_service
        .create_dashboard(auth.tenant_id, payload.name, payload.config)
        .await
        .map_err(ApiResponseError::internal_err)?;
    Ok(Json(
        serde_json::json!({ "id": dashboard.id, "version": dashboard.version }),
    ))
}

pub async fn list_dashboards(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let dashboards = state
        .vista_service
        .list_dashboards(auth.tenant_id)
        .await
        .map_err(ApiResponseError::internal_err)?;
    let resp = dashboards
        .into_iter()
        .map(|d| {
            serde_json::json!({
                "id": d.id,
                "name": d.name,
                "config": d.config,
                "created_at": d.created_at,
                "updated_at": d.updated_at,
                "version": d.version,
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
        .map_err(ApiResponseError::internal_err)?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct UpdateDashboardRequest {
    pub name: Option<String>,
    pub config: Option<serde_json::Value>,
}

pub async fn update_dashboard(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateDashboardRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;
    let dashboard = state
        .vista_service
        .update_dashboard(auth.tenant_id, id, payload.name, payload.config, if_match)
        .await
        .map_err(ApiResponseError::internal_err)?;
    Ok(Json(serde_json::json!({
        "id": dashboard.id,
        "name": dashboard.name,
        "config": dashboard.config,
        "created_at": dashboard.created_at,
        "updated_at": dashboard.updated_at,
        "version": dashboard.version,
    })))
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
            ataqu_application::vista_service::VistaServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            err => ApiResponseError::internal_err(err),
        })?;
    Ok(Json(results))
}

pub async fn get_data_points_handler(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(metric): Path<String>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let points = state
        .vista_service
        .get_data_points(auth.tenant_id, &metric, 1000)
        .await
        .map_err(ApiResponseError::internal_err)?;
    let resp = points
        .into_iter()
        .map(|p| {
            serde_json::json!({
                "timestamp": p.timestamp,
                "metric_name": p.metric_name,
                "value": p.value,
            })
        })
        .collect();
    Ok(Json(resp))
}

#[derive(Debug, Deserialize)]
pub struct DrillDownRequest {
    pub metric: String,
    pub dimension: String,
    pub value: String,
    pub limit: Option<u64>,
}

pub async fn drill_down(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<DrillDownRequest>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let results = state
        .vista_service
        .get_drill_down_data(
            auth.tenant_id,
            payload.metric,
            payload.dimension,
            payload.value,
            payload.limit.unwrap_or(1000),
        )
        .await
        .map_err(|e| match e {
            ataqu_application::vista_service::VistaServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            err => ApiResponseError::internal_err(err),
        })?;
    Ok(Json(results))
}

#[derive(Debug, Deserialize)]
pub struct CrossAppQuery {
    pub view: String,
}

pub async fn get_cross_app_dashboard(
    State(state): State<AppState>,
    auth: AuthContext,
    axum::extract::Query(query): axum::extract::Query<CrossAppQuery>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let results = state
        .vista_service
        .get_cross_app_dashboard(auth.tenant_id, query.view)
        .await
        .map_err(|e| match e {
            ataqu_application::vista_service::VistaServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            err => ApiResponseError::internal_err(err),
        })?;
    Ok(Json(results))
}

#[derive(Debug, Deserialize)]
pub struct CombineRequest {
    pub primary: String,
    pub secondary: String,
    pub from_date: chrono::DateTime<chrono::Utc>,
    pub to_date: chrono::DateTime<chrono::Utc>,
    pub group_by: Option<String>,
}

pub async fn combine_data(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<CombineRequest>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let group_by = req.group_by.unwrap_or_else(|| "day".to_string());
    let data = state
        .vista_service
        .get_combined_dashboard(
            auth.tenant_id,
            req.primary,
            req.secondary,
            req.from_date,
            req.to_date,
            group_by,
        )
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(data))
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/kpis", axum::routing::get(get_kpis))
        .route(
            "/dashboards",
            axum::routing::post(create_dashboard).get(list_dashboards),
        )
        .route(
            "/dashboards/:id",
            axum::routing::delete(delete_dashboard).put(update_dashboard),
        )
        .route(
            "/data-points/:metric",
            axum::routing::get(get_data_points_handler),
        )
        .route("/drill-down", axum::routing::post(drill_down))
        .route("/cross-app", axum::routing::get(get_cross_app_dashboard))
        .route("/combine", axum::routing::post(combine_data))
}
