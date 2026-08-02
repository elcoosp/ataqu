//! PAUSE API handlers — employee management, leave requests, and approvals.

use std::sync::Arc;

use axum::{
    Json, Router,
    extract::{Path, State},
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
    routing::{get, patch, post},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use ataqu_kernel::TenantId;
use ataqu_security::{Email, PiiAccessKey, PhoneNumber};

// ═══════════════════════════════════════════════════════════════════════
// PII Serialization Helpers (ADR-007)
// ═══════════════════════════════════════════════════════════════════════

fn serialize_email<S>(email: &Email, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let key = PiiAccessKey::new();
    serializer.serialize_str(email.reveal(&key))
}

fn serialize_phone_opt<S>(phone: &Option<PhoneNumber>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    match phone {
        Some(p) => {
            let key = PiiAccessKey::new();
            serializer.serialize_some(p.reveal(&key))
        }
        None => serializer.serialize_none(),
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Extractors
// ═══════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Copy)]
pub struct IdempotencyKey(Uuid);

impl IdempotencyKey {
    pub fn into_uuid(self) -> Uuid {
        self.0
    }
}

impl<S> axum::extract::FromRequestParts<S> for IdempotencyKey
where
    S: Send + Sync,
{
    type Rejection = PauseApiError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let header_value = parts
            .headers
            .get("idempotency-key")
            .ok_or(PauseApiError::MissingIdempotencyKey)?;

        let value_str = header_value
            .to_str()
            .map_err(|_| PauseApiError::InvalidIdempotencyKey)?;

        let uuid = Uuid::parse_str(value_str)
            .map_err(|_| PauseApiError::InvalidIdempotencyKey)?;

        Ok(Self(uuid))
    }
}

#[derive(Debug, Clone, Copy)]
pub struct TenantExtractor(pub TenantId);

impl<S> axum::extract::FromRequestParts<S> for TenantExtractor
where
    S: Send + Sync,
{
    type Rejection = PauseApiError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let header_value = parts
            .headers
            .get("x-tenant-id")
            .ok_or_else(|| PauseApiError::InvalidBody("Missing X-Tenant-ID header".into()))?;

        let value_str = header_value
            .to_str()
            .map_err(|_| PauseApiError::InvalidBody("Invalid X-Tenant-ID header".into()))?;

        let uuid = Uuid::parse_str(value_str).map_err(|_| {
            PauseApiError::InvalidBody("X-Tenant-ID must be a valid UUID".into())
        })?;

        Ok(Self(TenantId::new(uuid)))
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Error Types
// ═══════════════════════════════════════════════════════════════════════

#[derive(Debug)]
pub enum PauseServiceError {
    NotFound,
    Validation(String),
    Conflict(String),
    Internal,
}

#[derive(Debug, thiserror::Error)]
pub enum PauseApiError {
    #[error("Missing Idempotency-Key header")]
    MissingIdempotencyKey,

    #[error("Invalid Idempotency-Key header: must be a valid UUID")]
    InvalidIdempotencyKey,

    #[error("Invalid request: {0}")]
    InvalidBody(String),

    #[error("Resource not found")]
    NotFound,

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Internal server error")]
    Internal,
}

impl From<PauseServiceError> for PauseApiError {
    fn from(e: PauseServiceError) -> Self {
        match e {
            PauseServiceError::NotFound => Self::NotFound,
            PauseServiceError::Validation(msg) => Self::Validation(msg),
            PauseServiceError::Conflict(msg) => Self::Conflict(msg),
            PauseServiceError::Internal => Self::Internal,
        }
    }
}

impl IntoResponse for PauseApiError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            Self::MissingIdempotencyKey => (StatusCode::BAD_REQUEST, self.to_string()),
            Self::InvalidIdempotencyKey => (StatusCode::BAD_REQUEST, self.to_string()),
            Self::InvalidBody(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            Self::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            Self::Validation(_) => (StatusCode::UNPROCESSABLE_ENTITY, self.to_string()),
            Self::Conflict(_) => (StatusCode::CONFLICT, self.to_string()),
            Self::Internal => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        let body = Json(serde_json::json!({
            "error": message,
            "code": status.as_u16(),
        }));

        (status, body).into_response()
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeaveType {
    Annual,
    Sick,
    Personal,
    Unpaid,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeaveRequestStatus {
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

// ═══════════════════════════════════════════════════════════════════════
// Request DTOs
// ═══════════════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
pub struct CreateEmployeeRequest {
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub job_title: String,
    pub department: Option<String>,
}

impl CreateEmployeeRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.full_name.trim().is_empty() {
            return Err("full_name must not be empty".into());
        }
        if self.full_name.len() > 256 {
            return Err("full_name must not exceed 256 characters".into());
        }
        if self.email.trim().is_empty() || !self.email.contains('@') {
            return Err("email must be a valid email address".into());
        }
        if self.email.len() > 320 {
            return Err("email must not exceed 320 characters".into());
        }
        if let Some(phone) = &self.phone {
            if phone.trim().is_empty() {
                return Err("phone must not be empty if provided".into());
            }
            if phone.len() > 32 {
                return Err("phone must not exceed 32 characters".into());
            }
        }
        if self.job_title.trim().is_empty() {
            return Err("job_title must not be empty".into());
        }
        if self.job_title.len() > 128 {
            return Err("job_title must not exceed 128 characters".into());
        }
        if let Some(dept) = &self.department {
            if dept.trim().is_empty() {
                return Err("department must not be empty if provided".into());
            }
            if dept.len() > 128 {
                return Err("department must not exceed 128 characters".into());
            }
        }
        Ok(())
    }

    pub fn into_command(self) -> CreateEmployeeCommand {
        CreateEmployeeCommand {
            full_name: self.full_name,
            email: Email::new(self.email),
            phone: self.phone.map(PhoneNumber::new),
            job_title: self.job_title,
            department: self.department,
        }
    }
}

#[derive(Debug, Clone)]
pub struct CreateEmployeeCommand {
    pub full_name: String,
    pub email: Email,
    pub phone: Option<PhoneNumber>,
    pub job_title: String,
    pub department: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLeaveRequestRequest {
    pub employee_id: Uuid,
    pub leave_type: LeaveType,
    pub starts_at: chrono::DateTime<chrono::Utc>,
    pub ends_at: chrono::DateTime<chrono::Utc>,
    pub reason: Option<String>,
}

impl CreateLeaveRequestRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.ends_at <= self.starts_at {
            return Err("ends_at must be after starts_at".into());
        }
        if let Some(reason) = &self.reason {
            if reason.len() > 1024 {
                return Err("reason must not exceed 1024 characters".into());
            }
        }
        Ok(())
    }

    pub fn into_command(self) -> CreateLeaveRequestCommand {
        CreateLeaveRequestCommand {
            employee_id: self.employee_id,
            leave_type: self.leave_type,
            starts_at: self.starts_at,
            ends_at: self.ends_at,
            reason: self.reason,
        }
    }
}

#[derive(Debug, Clone)]
pub struct CreateLeaveRequestCommand {
    pub employee_id: Uuid,
    pub leave_type: LeaveType,
    pub starts_at: chrono::DateTime<chrono::Utc>,
    pub ends_at: chrono::DateTime<chrono::Utc>,
    pub reason: Option<String>,
}

// ═══════════════════════════════════════════════════════════════════════
// Response DTOs
// ═══════════════════════════════════════════════════════════════════════

#[derive(Debug, Serialize)]
pub struct EmployeeDto {
    pub id: Uuid,
    pub full_name: String,
    #[serde(serialize_with = "serialize_email")]
    pub email: Email,
    #[serde(serialize_with = "serialize_phone_opt")]
    pub phone: Option<PhoneNumber>,
    pub job_title: String,
    pub department: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct LeaveRequestDto {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub leave_type: LeaveType,
    pub starts_at: chrono::DateTime<chrono::Utc>,
    pub ends_at: chrono::DateTime<chrono::Utc>,
    pub reason: Option<String>,
    pub status: LeaveRequestStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// ═══════════════════════════════════════════════════════════════════════
// Service Trait
// ═══════════════════════════════════════════════════════════════════════

pub trait PauseService: Send + Sync {
    fn create_employee(
        &self,
        tenant_id: TenantId,
        cmd: CreateEmployeeCommand,
        idempotency_key: Uuid,
    ) -> impl std::future::Future<Output = Result<EmployeeDto, PauseServiceError>> + Send;

    fn get_employee(
        &self,
        tenant_id: TenantId,
        employee_id: Uuid,
    ) -> impl std::future::Future<Output = Result<EmployeeDto, PauseServiceError>> + Send;

    fn create_leave_request(
        &self,
        tenant_id: TenantId,
        cmd: CreateLeaveRequestCommand,
        idempotency_key: Uuid,
    ) -> impl std::future::Future<Output = Result<LeaveRequestDto, PauseServiceError>> + Send;

    fn approve_leave_request(
        &self,
        tenant_id: TenantId,
        request_id: Uuid,
        idempotency_key: Uuid,
    ) -> impl std::future::Future<Output = Result<LeaveRequestDto, PauseServiceError>> + Send;
}

// ═══════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════

#[derive(Clone)]
pub struct PauseAppState<S: PauseService> {
    pub service: Arc<S>,
}

// ═══════════════════════════════════════════════════════════════════════
// Handlers
// ═══════════════════════════════════════════════════════════════════════

pub async fn create_employee<S: PauseService>(
    State(state): State<PauseAppState<S>>,
    TenantExtractor(tenant_id): TenantExtractor,
    IdempotencyKey(idempotency_key): IdempotencyKey,
    Json(req): Json<CreateEmployeeRequest>,
) -> Result<(StatusCode, Json<EmployeeDto>), PauseApiError> {
    req.validate().map_err(PauseApiError::InvalidBody)?;
    let cmd = req.into_command();
    let dto = state
        .service
        .create_employee(tenant_id, cmd, idempotency_key)
        .await?;
    Ok((StatusCode::CREATED, Json(dto)))
}

pub async fn get_employee<S: PauseService>(
    State(state): State<PauseAppState<S>>,
    TenantExtractor(tenant_id): TenantExtractor,
    Path(employee_id): Path<Uuid>,
) -> Result<Json<EmployeeDto>, PauseApiError> {
    let dto = state.service.get_employee(tenant_id, employee_id).await?;
    Ok(Json(dto))
}

pub async fn create_leave_request<S: PauseService>(
    State(state): State<PauseAppState<S>>,
    TenantExtractor(tenant_id): TenantExtractor,
    IdempotencyKey(idempotency_key): IdempotencyKey,
    Json(req): Json<CreateLeaveRequestRequest>,
) -> Result<(StatusCode, Json<LeaveRequestDto>), PauseApiError> {
    req.validate().map_err(PauseApiError::InvalidBody)?;
    let cmd = req.into_command();
    let dto = state
        .service
        .create_leave_request(tenant_id, cmd, idempotency_key)
        .await?;
    Ok((StatusCode::CREATED, Json(dto)))
}

pub async fn approve_leave_request<S: PauseService>(
    State(state): State<PauseAppState<S>>,
    TenantExtractor(tenant_id): TenantExtractor,
    IdempotencyKey(idempotency_key): IdempotencyKey,
    Path(request_id): Path<Uuid>,
) -> Result<Json<LeaveRequestDto>, PauseApiError> {
    let dto = state
        .service
        .approve_leave_request(tenant_id, request_id, idempotency_key)
        .await?;
    Ok(Json(dto))
}

// ═══════════════════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════════════════

pub fn router<S: PauseService + 'static>() -> Router<PauseAppState<S>> {
    Router::new()
        .route("/employees", post(create_employee::<S>))
        .route("/employees/{id}", get(get_employee::<S>))
        .route("/leave-requests", post(create_leave_request::<S>))
        .route("/leave-requests/{id}/approve", patch(approve_leave_request::<S>))
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Request;
    use tower::ServiceExt;

    struct MockPauseService;

    impl PauseService for MockPauseService {
        async fn create_employee(
            &self,
            _tenant_id: TenantId,
            cmd: CreateEmployeeCommand,
            _idempotency_key: Uuid,
        ) -> Result<EmployeeDto, PauseServiceError> {
            if cmd.full_name == "Conflict" {
                return Err(PauseServiceError::Conflict("Duplicate".into()));
            }
            Ok(EmployeeDto {
                id: Uuid::new_v4(),
                full_name: cmd.full_name,
                email: cmd.email,
                phone: cmd.phone,
                job_title: cmd.job_title,
                department: cmd.department,
                created_at: chrono::Utc::now(),
            })
        }

        async fn get_employee(
            &self,
            _tenant_id: TenantId,
            _employee_id: Uuid,
        ) -> Result<EmployeeDto, PauseServiceError> {
            Ok(EmployeeDto {
                id: Uuid::new_v4(),
                full_name: "John Doe".into(),
                email: Email::new("john@example.com".into()),
                phone: None,
                job_title: "Engineer".into(),
                department: Some("IT".into()),
                created_at: chrono::Utc::now(),
            })
        }

        async fn create_leave_request(
            &self,
            _tenant_id: TenantId,
            _cmd: CreateLeaveRequestCommand,
            _idempotency_key: Uuid,
        ) -> Result<LeaveRequestDto, PauseServiceError> {
            Ok(LeaveRequestDto {
                id: Uuid::new_v4(),
                employee_id: Uuid::new_v4(),
                leave_type: LeaveType::Annual,
                starts_at: chrono::Utc::now(),
                ends_at: chrono::Utc::now(),
                reason: None,
                status: LeaveRequestStatus::Pending,
                created_at: chrono::Utc::now(),
            })
        }

        async fn approve_leave_request(
            &self,
            _tenant_id: TenantId,
            _request_id: Uuid,
            _idempotency_key: Uuid,
        ) -> Result<LeaveRequestDto, PauseServiceError> {
            Ok(LeaveRequestDto {
                id: Uuid::new_v4(),
                employee_id: Uuid::new_v4(),
                leave_type: LeaveType::Annual,
                starts_at: chrono::Utc::now(),
                ends_at: chrono::Utc::now(),
                reason: None,
                status: LeaveRequestStatus::Approved,
                created_at: chrono::Utc::now(),
            })
        }
    }

    fn app() -> Router {
        let state = PauseAppState {
            service: Arc::new(MockPauseService),
        };
        router::<MockPauseService>().with_state(state)
    }

    #[tokio::test]
    async fn test_create_employee_missing_idempotency_key() {
        let app = app();
        let req = Request::builder()
            .method("POST")
            .uri("/employees")
            .header("x-tenant-id", Uuid::new_v4().to_string())
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::json!({
                    "full_name": "Test",
                    "email": "test@test.com",
                    "job_title": "Test"
                })
                .to_string(),
            ))
            .unwrap();

        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_create_employee_invalid_body() {
        let app = app();
        let req = Request::builder()
            .method("POST")
            .uri("/employees")
            .header("x-tenant-id", Uuid::new_v4().to_string())
            .header("idempotency-key", Uuid::new_v4().to_string())
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::json!({
                    "full_name": "",
                    "email": "invalid",
                    "job_title": ""
                })
                .to_string(),
            ))
            .unwrap();

        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_create_employee_success() {
        let app = app();
        let req = Request::builder()
            .method("POST")
            .uri("/employees")
            .header("x-tenant-id", Uuid::new_v4().to_string())
            .header("idempotency-key", Uuid::new_v4().to_string())
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::json!({
                    "full_name": "Jane Doe",
                    "email": "jane@example.com",
                    "phone": "+1234567890",
                    "job_title": "Developer"
                })
                .to_string(),
            ))
            .unwrap();

        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
    }

    #[tokio::test]
    async fn test_create_employee_conflict() {
        let app = app();
        let req = Request::builder()
            .method("POST")
            .uri("/employees")
            .header("x-tenant-id", Uuid::new_v4().to_string())
            .header("idempotency-key", Uuid::new_v4().to_string())
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::json!({
                    "full_name": "Conflict",
                    "email": "test@example.com",
                    "job_title": "Tester"
                })
                .to_string(),
            ))
            .unwrap();

        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::CONFLICT);
    }

    #[tokio::test]
    async fn test_get_employee_success() {
        let app = app();
        let req = Request::builder()
            .method("GET")
            .uri(format!("/employees/{}", Uuid::new_v4()))
            .header("x-tenant-id", Uuid::new_v4().to_string())
            .body(Body::empty())
            .unwrap();

        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_approve_leave_request_success() {
        let app = app();
        let req = Request::builder()
            .method("PATCH")
            .uri(format!("/leave-requests/{}/approve", Uuid::new_v4()))
            .header("x-tenant-id", Uuid::new_v4().to_string())
            .header("idempotency-key", Uuid::new_v4().to_string())
            .body(Body::empty())
            .unwrap();

        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_create_leave_request_invalid_dates() {
        let app = app();
        let now = chrono::Utc::now();
        let req = Request::builder()
            .method("POST")
            .uri("/leave-requests")
            .header("x-tenant-id", Uuid::new_v4().to_string())
            .header("idempotency-key", Uuid::new_v4().to_string())
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::json!({
                    "employee_id": Uuid::new_v4(),
                    "leave_type": "annual",
                    "starts_at": now,
                    "ends_at": now
                })
                .to_string(),
            ))
            .unwrap();

        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }
}
