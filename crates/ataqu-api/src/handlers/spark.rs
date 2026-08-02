use axum::{
    Json,
    extract::{Path, State},
    http::HeaderMap,
    response::IntoResponse,
};
use serde::Serialize;
use tracing::instrument;
use uuid::Uuid;

use ataqu_application::spark_service::{CreateWorkflowRequest, SparkError};

#[derive(Debug, thiserror::Error)]
pub enum SparkApiError {
    #[error("Missing or invalid Idempotency-Key header")]
    MissingIdempotencyKey,
    #[error("Service error: {0}")]
    ServiceError(#[from] SparkError),
}

impl IntoResponse for SparkApiError {
    fn into_response(self) -> axum::response::Response {
        let status = match self {
            SparkApiError::MissingIdempotencyKey => axum::http::StatusCode::BAD_REQUEST,
            SparkApiError::ServiceError(_) => axum::http::StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, self.to_string()).into_response()
    }
}

#[derive(Debug, Serialize)]
pub struct WorkflowResponse {
    pub workflow_id: Uuid,
    pub status: String,
}

#[instrument(skip(state, req))]
pub async fn create_workflow(
    State(state): State<super::super::AppState>,
    headers: HeaderMap,
    Json(req): Json<CreateWorkflowRequest>,
) -> Result<impl IntoResponse, SparkApiError> {
    let idempotency_key = headers
        .get("idempotency-key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or(SparkApiError::MissingIdempotencyKey)?;

    tracing::info!(idempotency_key = %idempotency_key, "Creating workflow");

    let result = state
        .spark_service
        .create_workflow(idempotency_key, req)
        .await?;

    Ok(Json(WorkflowResponse {
        workflow_id: result.id,
        status: result.status,
    }))
}

#[instrument(skip(state))]
pub async fn execute_workflow(
    State(state): State<super::super::AppState>,
    headers: HeaderMap,
    Path(workflow_id): Path<Uuid>,
) -> Result<impl IntoResponse, SparkApiError> {
    let idempotency_key = headers
        .get("idempotency-key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or(SparkApiError::MissingIdempotencyKey)?;

    tracing::info!(idempotency_key = %idempotency_key, workflow_id = %workflow_id, "Executing workflow");

    let result = state
        .spark_service
        .execute_workflow(idempotency_key, workflow_id)
        .await?;

    Ok(Json(WorkflowResponse {
        workflow_id: result.id,
        status: result.status,
    }))
}

pub fn spark_router() -> axum::Router<super::super::AppState> {
    axum::Router::new()
        .route("/workflows", axum::routing::post(create_workflow))
        .route(
            "/workflows/:workflow_id/execute",
            axum::routing::post(execute_workflow),
        )
}
