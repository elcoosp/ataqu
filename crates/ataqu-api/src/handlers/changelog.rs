use axum::{
    Json,
    extract::{Query, State},
};
use serde::Deserialize;

use crate::error::{ApiResponseError, ApiResult};
use crate::{AppState, middleware::AuthContext};

#[derive(Deserialize)]
pub struct ChangelogQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    10
}

impl ChangelogQuery {
    /// Clamp the client-supplied limit: `?limit=-1` used to reach SQL verbatim
    /// (500) and `?limit=999999999` requested the whole table.
    fn clamped_limit(&self) -> i64 {
        self.limit.clamp(1, 100)
    }
}

pub async fn get_changelog(
    State(state): State<AppState>,
    Query(query): Query<ChangelogQuery>,
) -> ApiResult<Json<Vec<ataqu_domain_changelog::ChangelogEntry>>> {
    let entries = state
        .changelog_service
        .list_entries(query.clamped_limit())
        .await
        .map_err(ApiResponseError::internal_err)?;
    Ok(Json(entries))
}

pub async fn get_unread_changelog(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(query): Query<ChangelogQuery>,
) -> ApiResult<Json<Vec<ataqu_domain_changelog::ChangelogEntry>>> {
    let entries = state
        .changelog_service
        .list_unread_entries(auth.user_id, query.clamped_limit())
        .await
        .map_err(ApiResponseError::internal_err)?;
    Ok(Json(entries))
}

pub async fn mark_changelog_read(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<serde_json::Value>> {
    state
        .changelog_service
        .mark_read(auth.user_id)
        .await
        .map_err(ApiResponseError::internal_err)?;
    Ok(Json(serde_json::json!({ "status": "ok" })))
}
