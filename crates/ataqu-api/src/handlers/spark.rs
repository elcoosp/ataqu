use axum::{
    Router,
    extract::Query,
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
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
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<WorkflowResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let (workflows, total) = state
        .spark_service
        .list_workflows(auth.tenant_id, limit, offset)
        .await
        .map_err(ApiResponseError::internal_err)?;
    let items = workflows
        .into_iter()
        .map(|w| WorkflowResponse {
            id: w.id,
            name: w.name,
            is_active: w.is_active,
            created_at: w.created_at.into(),
            updated_at: w.updated_at.into(),
        })
        .collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
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
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
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
        .map_err(ApiResponseError::internal_err)?;
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
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;
    Ok(StatusCode::ACCEPTED)
}

pub async fn approve_workflow_run(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(run_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .spark_service
        .approve_workflow_run(auth.tenant_id, run_id, auth.user_id)
        .await
        .map_err(|e| match e {
            ataqu_application::spark_service::SparkServiceError::Validation(msg) => {
                ApiResponseError::validation(&msg)
            }
            ataqu_application::spark_service::SparkServiceError::WorkflowNotFound => {
                ApiResponseError::not_found("Workflow run not found")
            }
            _ => ApiResponseError::internal("An unexpected error occurred"),
        })?;

    Ok(StatusCode::OK)
}

#[derive(Debug, Serialize)]
pub struct WorkflowRunResponse {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_id: Uuid,
    pub status: String,
    pub payload: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListRunsParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

fn run_to_response(run: ataqu_domain_spark::workflow::WorkflowRun) -> WorkflowRunResponse {
    WorkflowRunResponse {
        id: run.id,
        tenant_id: run.tenant_id,
        workflow_id: run.workflow_id,
        status: serde_json::to_string(&run.status).unwrap_or_else(|_| format!("{:?}", run.status)),
        payload: run.payload,
        created_at: run.created_at.into(),
        updated_at: run.updated_at.into(),
    }
}

pub async fn list_workflow_runs(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<ListRunsParams>,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<WorkflowRunResponse>>> {
    let limit = params.limit.unwrap_or(100).min(1000);
    let offset = params.offset.unwrap_or(0);
    let runs = state
        .spark_service
        .list_runs(auth.tenant_id, limit, offset)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let total = runs.len() as u64;
    let items = runs.into_iter().map(run_to_response).collect();
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
}

pub async fn get_workflow_run(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(run_id): Path<Uuid>,
) -> ApiResult<Json<WorkflowRunResponse>> {
    let run = state
        .spark_service
        .get_run(auth.tenant_id, run_id)
        .await
        .map_err(|e| match e {
            ataqu_application::spark_service::SparkServiceError::WorkflowNotFound => {
                ApiResponseError::not_found("Workflow run not found")
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(Json(run_to_response(run)))
}

// ---- Dead-letter queue (DLQ) over core.outbox ----

#[derive(Debug, Serialize)]
pub struct DlqEntryResponse {
    pub id: i64,
    pub schema: String,
    pub event_type: String,
    pub aggregate_id: Option<Uuid>,
    pub payload: serde_json::Value,
    pub error: Option<String>,
    pub attempts: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListDlqParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

pub async fn list_dlq(
    State(state): State<AppState>,
    _auth: AuthContext,
    Query(params): Query<ListDlqParams>,
) -> ApiResult<Json<ataqu_contracts::PaginatedResponse<DlqEntryResponse>>> {
    let limit = params.limit.unwrap_or(100).min(1000);
    let offset = params.offset.unwrap_or(0);

    let pool = state.db.get_postgres_connection_pool();
    let rows = sqlx::query(
        "SELECT id, schema, event_type, aggregate_id, payload, attempts, created_at \
         FROM core.outbox WHERE status = 'dlq' ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    )
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(pool)
    .await
    .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    let mut items = Vec::new();
    for row in rows {
        let error: Option<String> = row
            .try_get("attempts")
            .ok()
            .and_then(|a: i32| {
                if a >= 3 {
                    Some(format!("max retries exceeded ({a})"))
                } else {
                    None
                }
            });
        items.push(DlqEntryResponse {
            id: row
                .try_get("id")
                .map_err(|e| ApiResponseError::internal(&e.to_string()))?,
            schema: row
                .try_get("schema")
                .map_err(|e| ApiResponseError::internal(&e.to_string()))?,
            event_type: row
                .try_get("event_type")
                .map_err(|e| ApiResponseError::internal(&e.to_string()))?,
            aggregate_id: row.try_get("aggregate_id").ok(),
            payload: row
                .try_get("payload")
                .map_err(|e| ApiResponseError::internal(&e.to_string()))?,
            error,
            attempts: row
                .try_get("attempts")
                .map_err(|e| ApiResponseError::internal(&e.to_string()))?,
            created_at: row
                .try_get("created_at")
                .map_err(|e| ApiResponseError::internal(&e.to_string()))?,
        });
    }

    let total = items.len() as u64;
    Ok(Json(ataqu_contracts::PaginatedResponse {
        items,
        total,
        limit,
        offset,
    }))
}

pub async fn replay_dlq(
    State(state): State<AppState>,
    _auth: AuthContext,
    Path(id): Path<i64>,
) -> ApiResult<StatusCode> {
    let res = sqlx::query(
        "UPDATE core.outbox SET status = 'pending', completed_at = NULL, locked_until = NULL \
         WHERE id = $1 AND status = 'dlq'",
    )
    .bind(id)
    .execute(state.db.get_postgres_connection_pool())
    .await
    .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    if res.rows_affected() == 0 {
        return Err(ApiResponseError::not_found("DLQ entry not found"));
    }
    Ok(StatusCode::OK)
}

pub async fn delete_dlq(
    State(state): State<AppState>,
    _auth: AuthContext,
    Path(id): Path<i64>,
) -> ApiResult<StatusCode> {
    let res = sqlx::query("DELETE FROM core.outbox WHERE id = $1 AND status = 'dlq'")
        .bind(id)
        .execute(state.db.get_postgres_connection_pool())
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    if res.rows_affected() == 0 {
        return Err(ApiResponseError::not_found("DLQ entry not found"));
    }
    Ok(StatusCode::NO_CONTENT)
}

pub fn public_routes() -> Router<AppState> {
    Router::new().route(
        "/webhooks/:tenant_id/:workflow_id",
        axum::routing::post(webhook_trigger),
    )
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
        .route("/workflows/runs", get(list_workflow_runs))
        .route("/workflows/runs/:id", get(get_workflow_run))
        .route(
            "/workflows/runs/:run_id/approve",
            post(approve_workflow_run),
        )
        .route("/dlq", get(list_dlq))
        .route("/dlq/:id/replay", post(replay_dlq))
        .route("/dlq/:id", axum::routing::delete(delete_dlq))
}
