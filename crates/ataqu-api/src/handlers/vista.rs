use axum::{
    extract::State,
    response::Json,
    Router,
};
use serde::Serialize;
use chrono::{DateTime, Utc};

use ataqu_application::vista_service::VistaService;
use crate::AppState;
use crate::middleware::AuthContext;
use crate::error::{ApiResponseError, ApiResult};

#[derive(Debug, Serialize)]
pub struct KpiSummary {
    pub total_events: u64,
    pub last_updated: DateTime<Utc>,
}

pub async fn get_kpis(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<KpiSummary>> {
    let view = state.vista_service.get_aggregated_view(auth.tenant_id).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(KpiSummary {
        total_events: view.total_events,
        last_updated: view.last_updated_at.into(),
    }))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/kpis", axum::routing::get(get_kpis))
}
