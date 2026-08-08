use axum::{
    Router,
    extract::Query,
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use ataqu_application::spark_service::{CreateWorkflowCommand, TriggerWorkflowCommand};

#[derive(Debug, Serialize)]
pub struct WorkflowResponse {
    pub id: Uuid,
    pub name: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub trigger: ataqu_domain_spark::Trigger,
    pub conditions: Vec<ataqu_domain_spark::Condition>,
    pub actions: Vec<ataqu_domain_spark::Action>,
    pub webhook_secret: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TriggerWorkflowRequest {
    pub payload: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWorkflowRequest {
    pub name: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ListWorkflowsParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

pub async fn list_workflows(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<ListWorkflowsParams>,
) -> ApiResult<Json<Vec<WorkflowResponse>>> {
    let workflows = state
        .spark_service
        .list_workflows(
            auth.tenant_id,
            params.limit.unwrap_or(100),
            params.offset.unwrap_or(0),
        )
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let resp = workflows
        .into_iter()
        .map(|w| WorkflowResponse {
            id: w.id,
            name: w.name,
            is_active: w.is_active,
            created_at: w.created_at.into(),
            updated_at: w.updated_at.into(),
        })
        .collect();
    Ok(Json(resp))
}

pub async fn create_workflow(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateWorkflowRequest>,
) -> ApiResult<(StatusCode, Json<WorkflowResponse>)> {
    let cmd = CreateWorkflowCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        trigger: payload.trigger,
        conditions: payload.conditions,
        actions: payload.actions,
        webhook_secret: payload.webhook_secret,
    };
    let workflow = state
        .spark_service
        .create_workflow(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let resp = WorkflowResponse {
        id: workflow.id,
        name: workflow.name,
        is_active: workflow.is_active,
        created_at: workflow.created_at.into(),
        updated_at: workflow.updated_at.into(),
    };
    Ok((StatusCode::CREATED, Json(resp)))
}

pub async fn get_workflow(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<WorkflowResponse>> {
    let workflow = state
        .spark_service
        .get_workflow(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    let resp = WorkflowResponse {
        id: workflow.id,
        name: workflow.name,
        is_active: workflow.is_active,
        created_at: workflow.created_at.into(),
        updated_at: workflow.updated_at.into(),
    };
    Ok(Json(resp))
}

pub async fn update_workflow(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateWorkflowRequest>,
) -> ApiResult<Json<WorkflowResponse>> {
    let if_match = headers
        .get(axum::http::header::IF_MATCH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.trim_matches('"').parse::<i32>().ok())
        .ok_or_else(|| {
            ApiResponseError::Validation("Invalid or missing If-Match header".to_string())
        })?;
    let cmd = ataqu_application::spark_service::UpdateWorkflowCommand {
        tenant_id: auth.tenant_id,
        id,
        name: payload.name,
        is_active: payload.is_active,
    };
    let workflow = state
        .spark_service
        .update_workflow(cmd, if_match)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let resp = WorkflowResponse {
        id: workflow.id,
        name: workflow.name,
        is_active: workflow.is_active,
        created_at: workflow.created_at.into(),
        updated_at: workflow.updated_at.into(),
    };
    Ok(Json(resp))
}

pub async fn delete_workflow(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .spark_service
        .delete_workflow(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn execute_workflow(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<TriggerWorkflowRequest>,
) -> ApiResult<StatusCode> {
    let cmd = TriggerWorkflowCommand {
        tenant_id: auth.tenant_id,
        workflow_id: id,
        payload: payload.payload,
    };
    state
        .spark_service
        .trigger_workflow(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::ACCEPTED)
}

pub async fn webhook_trigger(
    State(state): State<AppState>,
    Path((tenant_id, workflow_id)): Path<(Uuid, Uuid)>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> ApiResult<StatusCode> {
    let webhook_secret = headers
        .get("X-Webhook-Secret")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    state
        .spark_service
        .trigger_workflow_public(
            ataqu_kernel::TenantId::new(tenant_id),
            workflow_id,
            payload,
            webhook_secret,
        )
        .await
        .map_err(|e| match e {
            ataqu_application::spark_service::SparkServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(StatusCode::ACCEPTED)
}

pub fn public_routes() -> Router<AppState> {
    Router::new().route(
        "/webhooks/:tenant_id/:workflow_id",
        axum::routing::post(webhook_trigger),
    )
}

pub async fn list_templates(
    State(_state): State<AppState>,
    _auth: AuthContext,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    // Templates are now persisted via PIVOT. This endpoint is deprecated.
    Ok(Json(vec![]))
}

pub fn routes() -> Router<AppState> {
    use axum::routing::{get, post};
    Router::new()
        .route("/workflows", get(list_workflows).post(create_workflow))
        .route(
            "/workflows/:id",
            get(get_workflow)
                .put(update_workflow)
                .delete(delete_workflow),
        )
        .route("/workflows/:id/execute", post(execute_workflow))
        .route("/templates", get(list_templates))
}
