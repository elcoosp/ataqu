use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use crate::serializers::{ApiEmail, ApiPhone};
use ataqu_application::pause_service::{
    CreateEmployeeCommand, Employee, LeaveRequest, LeaveType, RequestLeaveCommand,
};
use ataqu_domain_pause;
use ataqu_security::{Email, PhoneNumber};

#[derive(Debug, Deserialize)]
pub struct CreateEmployeeRequest {
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub job_title: String,
    pub department: Option<String>,
    pub hire_date: NaiveDate,
}

#[derive(Debug, Serialize)]
pub struct EmployeeResponse {
    pub id: Uuid,
    pub full_name: String,
    pub email: ApiEmail,
    pub phone: Option<ApiPhone>,
    pub job_title: String,
    pub department: Option<String>,
    pub hire_date: NaiveDate,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Employee> for EmployeeResponse {
    fn from(e: Employee) -> Self {
        Self {
            id: e.id,
            full_name: e.full_name,
            email: ApiEmail::new(e.email),
            phone: e.phone.map(ApiPhone::new),
            job_title: e.job_title,
            department: e.department,
            hire_date: e.hire_date,
            is_active: e.is_active,
            created_at: e.created_at.into(),
            updated_at: e.updated_at.into(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateLeaveRequest {
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LeaveRequestResponse {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<LeaveRequest> for LeaveRequestResponse {
    fn from(l: LeaveRequest) -> Self {
        Self {
            id: l.id,
            employee_id: l.employee_id,
            leave_type: format!("{:?}", l.leave_type).to_lowercase(),
            start_date: l.start_date,
            end_date: l.end_date,
            reason: l.reason,
            status: format!("{:?}", l.status).to_lowercase(),
            created_at: l.created_at.into(),
            updated_at: l.updated_at.into(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

pub async fn create_employee(
    State(state): State<AppState>,
    auth: AuthContext,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateEmployeeRequest>,
) -> ApiResult<(StatusCode, Json<EmployeeResponse>)> {
    let cmd = CreateEmployeeCommand {
        tenant_id: auth.tenant_id,
        full_name: req.full_name.clone(),
        email: Email::new(req.email.clone()),
        phone: req.phone.clone().map(PhoneNumber::new),
        job_title: req.job_title.clone(),
        department: req.department.clone(),
        hire_date: req.hire_date,
    };
    let command_id = headers
        .get("Idempotency-Key")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(|| Uuid::new_v5(&Uuid::NAMESPACE_URL, b"pause_employee"));

    let employee_id = state
        .pause_service
        .create_employee(
            &auth.tenant_id,
            cmd,
            &*state.id_gen,
            &*state.clock,
            command_id,
        )
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    let employee = state
        .pause_service
        .find_employee(&auth.tenant_id, employee_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok((StatusCode::CREATED, Json(employee.into())))
}

pub async fn request_leave(
    State(state): State<AppState>,
    auth: AuthContext,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateLeaveRequest>,
) -> ApiResult<(StatusCode, Json<LeaveRequestResponse>)> {
    let leave_type = match req.leave_type.as_str() {
        "annual" => LeaveType::Annual,
        "sick" => LeaveType::Sick,
        "personal" => LeaveType::Personal,
        "unpaid" => LeaveType::Unpaid,
        _ => return Err(ApiResponseError::validation("Invalid leave type")),
    };
    let cmd = RequestLeaveCommand {
        tenant_id: auth.tenant_id,
        employee_id: req.employee_id,
        leave_type,
        start_date: req.start_date,
        end_date: req.end_date,
        reason: req.reason.clone(),
    };
    let command_id = headers
        .get("Idempotency-Key")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(|| Uuid::new_v5(&Uuid::NAMESPACE_URL, b"pause_leave"));
    let request_id = state
        .pause_service
        .request_leave(
            &auth.tenant_id,
            cmd,
            &*state.id_gen,
            &*state.clock,
            command_id,
        )
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    let request = state
        .pause_service
        .find_leave_request(&auth.tenant_id, request_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok((StatusCode::CREATED, Json(request.into())))
}

pub async fn list_employees(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<EmployeeResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let employees = state
        .pause_service
        .list_employees(&auth.tenant_id, limit, offset)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        employees.into_iter().map(EmployeeResponse::from).collect(),
    ))
}

pub async fn deactivate_employee(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    if !auth.has_role("admin") && !auth.has_role("manager") {
        return Err(ApiResponseError::Forbidden(
            "Manager or Admin access required".to_string(),
        ));
    }
    state
        .pause_service
        .deactivate_employee(&auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    #[serde(default = "default_search_limit")]
    pub limit: u64,
}

fn default_search_limit() -> u64 {
    20
}

pub async fn search_employees(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<SearchParams>,
) -> ApiResult<Json<Vec<EmployeeResponse>>> {
    let employees = state
        .pause_service
        .search_employees(&auth.tenant_id, &params.q, params.limit)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        employees.into_iter().map(EmployeeResponse::from).collect(),
    ))
}

pub async fn list_leave_requests(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<LeaveRequestResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let requests = state
        .pause_service
        .list_leave_requests(&auth.tenant_id, limit, offset)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        requests
            .into_iter()
            .map(LeaveRequestResponse::from)
            .collect(),
    ))
}

pub async fn approve_leave(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<LeaveRequestResponse>> {
    if !auth.has_role("admin") && !auth.has_role("manager") {
        return Err(ApiResponseError::Forbidden(
            "Manager or Admin access required".to_string(),
        ));
    }
    let request = state
        .pause_service
        .approve_leave(&auth.tenant_id, id, auth.user_id, &*state.clock)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(request.into()))
}

pub async fn reject_leave(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<LeaveRequestResponse>> {
    if !auth.has_role("admin") && !auth.has_role("manager") {
        return Err(ApiResponseError::Forbidden(
            "Manager or Admin access required".to_string(),
        ));
    }
    let request = state
        .pause_service
        .reject_leave(&auth.tenant_id, id, auth.user_id, &*state.clock)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(request.into()))
}

pub async fn cancel_leave(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<LeaveRequestResponse>> {
    if !auth.has_role("admin") && !auth.has_role("manager") {
        return Err(ApiResponseError::Forbidden(
            "Manager or Admin access required".to_string(),
        ));
    }
    let request = state
        .pause_service
        .cancel_leave(&auth.tenant_id, id, auth.user_id, &*state.clock)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(request.into()))
}

#[derive(Debug, Deserialize)]
pub struct UpdateEmployeeRequest {
    pub full_name: Option<String>,
    pub job_title: Option<String>,
    pub department: Option<Option<String>>,
}

pub async fn update_employee(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateEmployeeRequest>,
) -> ApiResult<Json<EmployeeResponse>> {
    if !auth.has_role("admin") && !auth.has_role("manager") {
        return Err(ApiResponseError::Forbidden(
            "Manager or Admin access required".to_string(),
        ));
    }
    let cmd = ataqu_domain_pause::employee::UpdateEmployeeCommand {
        tenant_id: auth.tenant_id,
        employee_id: id,
        full_name: payload.full_name,
        job_title: payload.job_title,
        department: payload.department,
    };
    let employee = state
        .pause_service
        .update_employee(&auth.tenant_id, cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(employee.into()))
}

#[derive(Debug, Deserialize)]
pub struct UploadDocumentRequest {
    pub file_name: String,
    pub file_url: String,
    pub doc_type: String,
}

pub async fn upload_document(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(employee_id): Path<Uuid>,
    Json(payload): Json<UploadDocumentRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    if !auth.has_role("admin") && !auth.has_role("manager") {
        return Err(ApiResponseError::Forbidden(
            "Manager or Admin access required".to_string(),
        ));
    }
    let cmd = ataqu_domain_pause::CreateDocumentCommand {
        tenant_id: auth.tenant_id,
        employee_id,
        file_name: payload.file_name,
        file_url: payload.file_url,
        doc_type: payload.doc_type,
    };
    let doc = state
        .pause_service
        .upload_document(cmd, &*state.id_gen, &*state.clock)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(serde_json::json!({
        "id": doc.id,
        "file_name": doc.file_name,
        "file_url": doc.file_url,
    })))
}

pub async fn list_documents(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(employee_id): Path<Uuid>,
) -> ApiResult<Json<Vec<serde_json::Value>>> {
    let docs = state
        .pause_service
        .list_documents(auth.tenant_id, employee_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    let list = docs
        .iter()
        .map(|d| {
            serde_json::json!({
                "id": d.id,
                "file_name": d.file_name,
                "file_url": d.file_url,
                "doc_type": d.doc_type,
            })
        })
        .collect();
    Ok(Json(list))
}

pub fn routes() -> Router<AppState> {
    use axum::routing::{get, patch, post, put};
    Router::new()
        .route("/employees", post(create_employee).get(list_employees))
        .route("/employees/search", get(search_employees))
        .route("/employees/:id", put(update_employee))
        .route("/employees/:id/deactivate", post(deactivate_employee))
        .route(
            "/leave-requests",
            post(request_leave).get(list_leave_requests),
        )
        .route("/leave-requests/:id/approve", patch(approve_leave))
        .route("/leave-requests/:id/reject", patch(reject_leave))
        .route("/leave-requests/:id/cancel", patch(cancel_leave))
        .route(
            "/employees/:id/documents",
            post(upload_document).get(list_documents),
        )
}
