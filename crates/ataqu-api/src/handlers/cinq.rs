//! CINQ API handlers using AuthContext.
//! Only implements endpoints that are fully supported by CinqService.

use axum::{
    Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use ataqu_application::cinq_service::{
    CreateActivityCommand, CreateContactCommand, CreateDealCommand, CreatePipelineStageCommand,
    UpdateContactCommand, UpdateDealCommand,
};
use ataqu_contracts::cinq::*;
use ataqu_domain_cinq::activity::ActivityType;
use ataqu_domain_cinq::contact::Contact;
use ataqu_domain_cinq::deal::{Deal, DealStatus};
use ataqu_security::{Email, PhoneNumber};

use crate::AppState;
use crate::error::{ApiResponseError, ApiResult};
use crate::middleware::AuthContext;
use crate::serializers::{ApiEmail, ApiPhone};

// ---------- Pagination ----------
#[derive(Debug, Deserialize, Default)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

// ---------- Contact Responses ----------
#[derive(Debug, Serialize)]
pub struct ContactResponse {
    pub id: Uuid,
    pub name: String,
    pub email: ApiEmail,
    pub phone: Option<ApiPhone>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Contact> for ContactResponse {
    fn from(c: Contact) -> Self {
        Self {
            id: c.id,
            name: c.name,
            email: ApiEmail::new(c.email),
            phone: c.phone.map(ApiPhone::new),
            created_at: c.created_at,
            updated_at: c.updated_at,
        }
    }
}

// ---------- Deal Responses ----------
#[derive(Debug, Serialize)]
pub struct DealResponse {
    pub id: Uuid,
    pub title: String,
    pub amount: Decimal,
    pub status: String,
    pub contact_id: Uuid,
    pub pipeline_stage_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Deal> for DealResponse {
    fn from(d: Deal) -> Self {
        Self {
            id: d.id,
            title: d.title,
            amount: d.amount,
            status: format!("{:?}", d.status).to_lowercase(),
            contact_id: d.contact_id,
            pipeline_stage_id: d.pipeline_stage_id,
            created_at: d.created_at,
            updated_at: d.updated_at,
        }
    }
}

// ---------- Contact Endpoints ----------
pub async fn create_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateContactRequest>,
) -> ApiResult<(StatusCode, Json<ContactResponse>)> {
    let cmd = CreateContactCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        email: Email::new(payload.email),
        phone: payload.phone.map(PhoneNumber::new),
        custom_fields: payload.custom_fields,
        lead_score: None,
    };
    let contact = state
        .cinq_service
        .create_contact(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(ContactResponse::from(contact))))
}

pub async fn list_contacts(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<ContactResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let contacts = state
        .cinq_service
        .list_contacts(auth.tenant_id, limit, offset)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        contacts.into_iter().map(ContactResponse::from).collect(),
    ))
}

pub async fn get_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<ContactResponse>> {
    let contact = state
        .cinq_service
        .get_contact(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(ContactResponse::from(contact)))
}

pub async fn update_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateContactRequest>,
) -> ApiResult<Json<ContactResponse>> {
    let cmd = UpdateContactCommand {
        id,
        tenant_id: auth.tenant_id,
        name: payload.name,
        email: payload.email.map(Email::new),
        phone: payload.phone.map(|p| p.map(PhoneNumber::new)),
        custom_fields: payload.custom_fields,
        lead_score: payload.lead_score,
    };
    let contact = state
        .cinq_service
        .update_contact(cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::ContactNotFound => {
                ApiResponseError::not_found("Contact not found")
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(Json(ContactResponse::from(contact)))
}

pub async fn delete_contact(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .cinq_service
        .delete_contact(auth.tenant_id, id)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::ContactNotFound => {
                ApiResponseError::not_found("Contact not found")
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- Deal Endpoints ----------
pub async fn create_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateDealRequest>,
) -> ApiResult<(StatusCode, Json<DealResponse>)> {
    let pipeline_stage_id = if let Some(id) = payload.pipeline_stage_id {
        state.cinq_service.get_pipeline_stage(auth.tenant_id, id).await
            .map_err(|_| ApiResponseError::validation("Invalid pipeline_stage_id"))?;
        id
    } else {
        let stages = state.cinq_service.list_pipeline_stages(auth.tenant_id).await
            .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
        stages.first()
            .ok_or_else(|| ApiResponseError::validation("No pipeline stages exist for this tenant"))?
            .id
    };

    let cmd = CreateDealCommand {
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        title: payload.title,
        pipeline_stage_id,
        amount: payload.amount,
        status: DealStatus::Open,
    };
    let deal = state
        .cinq_service
        .create_deal(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(DealResponse::from(deal))))
}

pub async fn list_deals(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<DealResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let deals = state
        .cinq_service
        .list_deals(auth.tenant_id, limit, offset)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(deals.into_iter().map(DealResponse::from).collect()))
}

pub async fn get_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<DealResponse>> {
    let deal = state
        .cinq_service
        .get_deal(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(DealResponse::from(deal)))
}

pub async fn update_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDealRequest>,
) -> ApiResult<Json<DealResponse>> {
    let status = if let Some(s) = payload.status {
        match s.to_lowercase().as_str() {
            "open" => Some(DealStatus::Open),
            "won" => Some(DealStatus::Won),
            "lost" => Some(DealStatus::Lost),
            _ => return Err(ApiResponseError::validation("Invalid deal status")),
        }
    } else { None };
    let cmd = UpdateDealCommand {
        id,
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        title: payload.title,
        pipeline_stage_id: payload.pipeline_stage_id,
        amount: payload.amount,
        status,
    };
    let deal = state
        .cinq_service
        .update_deal(cmd)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::DealNotFound => {
                ApiResponseError::not_found("Deal not found")
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(Json(DealResponse::from(deal)))
}

pub async fn delete_deal(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .cinq_service
        .delete_deal(auth.tenant_id, id)
        .await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::DealNotFound => {
                ApiResponseError::not_found("Deal not found")
            }
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- Pipeline Stages ----------
pub async fn list_pipeline_stages(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<Json<Vec<PipelineStageResponse>>> {
    let stages = state
        .cinq_service
        .list_pipeline_stages(auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        stages
            .into_iter()
            .map(|s| PipelineStageResponse {
                id: s.id,
                name: s.name,
                order: s.order,
            })
            .collect(),
    ))
}

pub async fn create_pipeline_stage(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreatePipelineStageRequest>,
) -> ApiResult<(StatusCode, Json<PipelineStageResponse>)> {
    let cmd = CreatePipelineStageCommand {
        tenant_id: auth.tenant_id,
        name: payload.name,
        order: payload.order,
    };
    let stage = state
        .cinq_service
        .create_pipeline_stage(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((
        StatusCode::CREATED,
        Json(PipelineStageResponse {
            id: stage.id,
            name: stage.name,
            order: stage.order,
        }),
    ))
}

pub async fn update_pipeline_stage(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePipelineStageRequest>,
) -> ApiResult<Json<PipelineStageResponse>> {
    let stage = state
        .cinq_service
        .update_pipeline_stage(auth.tenant_id, id, payload.name, payload.order)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(PipelineStageResponse {
        id: stage.id,
        name: stage.name,
        order: stage.order,
    }))
}

pub async fn delete_pipeline_stage(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state
        .cinq_service
        .delete_pipeline_stage(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- Activities ----------
pub async fn create_activity(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateActivityRequest>,
) -> ApiResult<(StatusCode, Json<ActivityResponse>)> {
    let activity_type = match payload.activity_type.to_lowercase().as_str() {
        "call" => ActivityType::Call,
        "email" => ActivityType::Email,
        "meeting" => ActivityType::Meeting,
        "task" => ActivityType::Task,
        "note" => ActivityType::Note,
        _ => return Err(ApiResponseError::validation("Invalid activity_type")),
    };
    let cmd = CreateActivityCommand {
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        deal_id: payload.deal_id,
        activity_type,
        description: payload.description,
        scheduled_at: payload.scheduled_at,
    };
    let activity = state
        .cinq_service
        .create_activity(cmd)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((
        StatusCode::CREATED,
        Json(ActivityResponse {
            id: activity.id,
            description: activity.description,
        }),
    ))
}

pub async fn list_activities(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<ListActivitiesParams>,
) -> ApiResult<Json<Vec<ActivityResponse>>> {
    let contact_id = params
        .contact_id
        .ok_or_else(|| ApiResponseError::validation("contact_id required"))?;
    let activities = state
        .cinq_service
        .list_activities_for_contact(auth.tenant_id, contact_id, 100, 0)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        activities
            .into_iter()
            .map(|a| ActivityResponse {
                id: a.id,
                description: a.description,
            })
            .collect(),
    ))
}

pub async fn get_activity(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<ActivityResponse>> {
    let activity = state
        .cinq_service
        .get_activity(auth.tenant_id, id)
        .await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;
    Ok(Json(ActivityResponse {
        id: activity.id,
        description: activity.description,
    }))
}

// ---------- Search ----------
pub async fn search_contacts(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<SearchParams>,
) -> ApiResult<Json<Vec<ContactResponse>>> {
    let contacts = state
        .cinq_service
        .search_contacts(auth.tenant_id, &params.q, params.limit.unwrap_or(20))
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        contacts.into_iter().map(ContactResponse::from).collect(),
    ))
}

#[derive(Debug, Deserialize)]
pub struct CustomFieldSearchParams {
    pub field: String,
    pub value: String,
}

pub async fn search_by_custom_field(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<CustomFieldSearchParams>,
) -> ApiResult<Json<Vec<ContactResponse>>> {
    let contacts = state
        .cinq_service
        .search_by_custom_field(auth.tenant_id, &params.field, serde_json::json!(params.value))
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(
        contacts.into_iter().map(ContactResponse::from).collect(),
    ))
}

// ---------- CSV ----------
pub async fn import_csv(
    State(state): State<AppState>,
    auth: AuthContext,
    body: String,
) -> ApiResult<Json<ImportCsvResult>> {
    use csv::ReaderBuilder;
    let mut rdr = ReaderBuilder::new().from_reader(body.as_bytes());
    let mut rows = Vec::new();
    for result in rdr.deserialize() {
        let record: std::collections::HashMap<String, String> =
            result.map_err(|e| ApiResponseError::validation(&e.to_string()))?;
        rows.push(record);
    }
    let (imported, failed) = state
        .cinq_service
        .import_contacts(auth.tenant_id, rows)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(ImportCsvResult {
        imported,
        failed,
    }))
}

pub async fn export_csv(
    State(state): State<AppState>,
    auth: AuthContext,
) -> ApiResult<impl axum::response::IntoResponse> {
    let csv_data = state
        .cinq_service
        .export_contacts(auth.tenant_id)
        .await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::OK, csv_data))
}

// ---------- Tasks ----------
#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub contact_id: Option<Uuid>,
    pub deal_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
pub struct TaskResponse {
    pub id: Uuid,
    pub contact_id: Option<Uuid>,
    pub deal_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<ataqu_domain_cinq::task::Task> for TaskResponse {
    fn from(t: ataqu_domain_cinq::task::Task) -> Self {
        Self {
            id: t.id,
            contact_id: t.contact_id,
            deal_id: t.deal_id,
            assigned_to: t.assigned_to,
            title: t.title,
            description: t.description,
            due_date: t.due_date,
            status: format!("{:?}", t.status).to_lowercase(),
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}

pub async fn create_task(
    State(state): State<AppState>,
    auth: AuthContext,
    Json(payload): Json<CreateTaskRequest>,
) -> ApiResult<(StatusCode, Json<TaskResponse>)> {
    let cmd = ataqu_domain_cinq::task::CreateTaskCommand {
        tenant_id: auth.tenant_id,
        contact_id: payload.contact_id,
        deal_id: payload.deal_id,
        assigned_to: payload.assigned_to,
        title: payload.title,
        description: payload.description,
        due_date: payload.due_date,
    };
    let task = state.cinq_service.create_task(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok((StatusCode::CREATED, Json(task.into())))
}

pub async fn list_tasks(
    State(state): State<AppState>,
    auth: AuthContext,
    Query(params): Query<PaginationParams>,
) -> ApiResult<Json<Vec<TaskResponse>>> {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let tasks = state.cinq_service.list_tasks(auth.tenant_id, limit, offset).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(tasks.into_iter().map(TaskResponse::from).collect()))
}

pub async fn get_task(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<TaskResponse>> {
    let task = state.cinq_service.get_task(auth.tenant_id, id).await
        .map_err(|e| match e {
            ataqu_application::cinq_service::CinqServiceError::TaskNotFound => ApiResponseError::not_found("Task not found"),
            _ => ApiResponseError::internal(&e.to_string()),
        })?;
    Ok(Json(task.into()))
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: Option<String>,
}

pub async fn update_task(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateTaskRequest>,
) -> ApiResult<Json<TaskResponse>> {
    let status = payload.status.map(|s| match s.to_lowercase().as_str() {
        "completed" => ataqu_domain_cinq::task::TaskStatus::Completed,
        "cancelled" => ataqu_domain_cinq::task::TaskStatus::Cancelled,
        _ => ataqu_domain_cinq::task::TaskStatus::Pending,
    });
    let cmd = ataqu_domain_cinq::task::UpdateTaskCommand {
        id,
        tenant_id: auth.tenant_id,
        title: payload.title,
        description: payload.description,
        due_date: payload.due_date,
        status,
    };
    let task = state.cinq_service.update_task(cmd).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(task.into()))
}

pub async fn delete_task(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    state.cinq_service.delete_task(auth.tenant_id, id).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_contact_tasks(
    State(state): State<AppState>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<Vec<TaskResponse>>> {
    let tasks = state.cinq_service.list_tasks_for_contact(auth.tenant_id, id, 100, 0).await
        .map_err(|e| ApiResponseError::internal(&e.to_string()))?;
    Ok(Json(tasks.into_iter().map(TaskResponse::from).collect()))
}

// ---------- Email Tracking ----------
pub async fn track_email(
    state: State<AppState>,
    auth: AuthContext,
    Json(payload): Json<TrackEmailRequest>,
) -> ApiResult<StatusCode> {
    super::email_tracking::track_email(state, auth, Json(payload)).await.map(|_| StatusCode::ACCEPTED)
}

// ---------- Router ----------
pub fn routes() -> Router<AppState> {
    use axum::routing::{get, post, put};
    Router::new()
        .route("/contacts", post(create_contact).get(list_contacts))
        .route(
            "/contacts/:id",
            get(get_contact).put(update_contact).delete(delete_contact),
        )
        .route("/deals", post(create_deal).get(list_deals))
        .route(
            "/deals/:id",
            get(get_deal).put(update_deal).delete(delete_deal),
        )
        .route(
            "/pipeline/stages",
            get(list_pipeline_stages).post(create_pipeline_stage),
        )
        .route(
            "/pipeline/stages/:id",
            put(update_pipeline_stage).delete(delete_pipeline_stage),
        )
        .route("/activities", post(create_activity).get(list_activities))
        .route("/activities/:id", get(get_activity))
        .route("/tasks", post(create_task).get(list_tasks))
        .route("/tasks/:id", get(get_task).put(update_task).delete(delete_task))
        .route("/contacts/:id/tasks", get(list_contact_tasks))
        .route("/search", get(search_contacts))
        .route("/search/custom", get(search_by_custom_field))
        .route("/csv/import", post(import_csv))
        .route("/csv/export", get(export_csv))
        .route("/email/track", post(track_email))
}
