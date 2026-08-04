use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate};

use ataqu_application::pause_service::{
    CreateEmployeeCommand, RequestLeaveCommand, LeaveType,
};
use crate::AppState;
use crate::middleware::AuthContext;
use crate::error::{ApiResponseError, ApiResult};

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
    pub email: String,
    pub phone: Option<String>,
    pub job_title: String,
    pub department: Option<String>,
    pub hire_date: NaiveDate,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
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

pub async fn create_employee(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<CreateEmployeeRequest>,
) -> ApiResult<(StatusCode, Json<EmployeeResponse>)> {
    // Clone fields to avoid move issues
    let full_name = req.full_name.clone();
    let email = req.email.clone();
    let phone = req.phone.clone();
    let job_title = req.job_title.clone();
    let department = req.department.clone();
    let hire_date = req.hire_date;

    let cmd = CreateEmployeeCommand {
        tenant_id: auth.tenant_id,
        full_name: full_name.clone(),
        email: email.clone(),
        phone: phone.clone(),
        job_title: job_title.clone(),
        department: department.clone(),
        hire_date,
    };
    let employee_id = state.pause_service.create_employee(
        &auth.tenant_id,
        cmd,
        &*state.id_gen,
        &*state.clock,
        Uuid::new_v4(),
    ).await.map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok((StatusCode::CREATED, Json(EmployeeResponse {
        id: employee_id,
        full_name,
        email,
        phone,
        job_title,
        department,
        hire_date,
        is_active: true,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    })))
}

pub async fn request_leave(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(req): Json<CreateLeaveRequest>,
) -> ApiResult<(StatusCode, Json<LeaveRequestResponse>)> {
    let leave_type = match req.leave_type.as_str() {
        "annual" => LeaveType::Annual,
        "sick" => LeaveType::Sick,
        "personal" => LeaveType::Personal,
        "unpaid" => LeaveType::Unpaid,
        _ => return Err(ApiResponseError::validation("Invalid leave type")),
    };
    let reason = req.reason.clone();
    let cmd = RequestLeaveCommand {
        tenant_id: auth.tenant_id,
        employee_id: req.employee_id,
        leave_type,
        start_date: req.start_date,
        end_date: req.end_date,
        reason: reason.clone(),
    };
    let request_id = state.pause_service.request_leave(
        &auth.tenant_id,
        cmd,
        &*state.id_gen,
        &*state.clock,
        Uuid::new_v4(),
    ).await.map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok((StatusCode::CREATED, Json(LeaveRequestResponse {
        id: request_id,
        employee_id: req.employee_id,
        leave_type: req.leave_type,
        start_date: req.start_date,
        end_date: req.end_date,
        reason,
        status: "pending".to_string(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    })))
}

pub async fn list_employees(
    _state: State<AppState>,
    _auth: AuthContext,
) -> ApiResult<Json<Vec<EmployeeResponse>>> {
    // TODO: implement list in PauseService
    Err(ApiResponseError::internal("List employees not yet implemented"))
}

pub async fn list_leave_requests(
    _state: State<AppState>,
    _auth: AuthContext,
) -> ApiResult<Json<Vec<LeaveRequestResponse>>> {
    Err(ApiResponseError::internal("List leave requests not yet implemented"))
}

pub fn routes() -> Router<AppState> {
    use axum::routing::{get, post};
    Router::new()
        .route("/employees", post(create_employee).get(list_employees))
        .route("/leave-requests", post(request_leave).get(list_leave_requests))
}
