use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;

use crate::{AppState, middleware::AuthContext};

#[derive(Deserialize)]
pub struct ChangelogQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    10
}

pub async fn get_changelog(
    State(state): State<AppState>,
    Query(query): Query<ChangelogQuery>,
) -> impl IntoResponse {
    match state.changelog_service.list_entries(query.limit).await {
        Ok(entries) => (StatusCode::OK, Json(entries)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn get_unread_changelog(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(query): Query<ChangelogQuery>,
) -> impl IntoResponse {
    match state
        .changelog_service
        .list_unread_entries(auth.user_id, query.limit)
        .await
    {
        Ok(entries) => (StatusCode::OK, Json(entries)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}
