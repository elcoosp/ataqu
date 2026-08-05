use axum::{
    extract::{Path, State},
    http::StatusCode,
};
use uuid::Uuid;

use crate::{
    AppState,
    error::{ApiResponseError, ApiResult},
    middleware::AuthContext,
};

pub async fn request_tenant_deletion(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(tenant_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") {
        return Err(ApiResponseError::Forbidden(
            "Admin access required".to_string(),
        ));
    }
    if auth.tenant_id.as_uuid() != tenant_id {
        return Err(ApiResponseError::Forbidden(
            "Cannot delete data for another tenant".to_string(),
        ));
    }

    state
        .aegis_service
        .request_gdpr_deletion(tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok(StatusCode::ACCEPTED)
}

pub fn routes() -> axum::Router<crate::AppState> {
    axum::Router::new().route(
        "/tenants/:id",
        axum::routing::delete(request_tenant_deletion),
    )
}
