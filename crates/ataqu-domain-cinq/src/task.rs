use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskStatus {
    Pending,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Task {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub contact_id: Option<Uuid>,
    pub deal_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: TaskStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
}

#[derive(Debug, Clone)]
pub struct CreateTaskCommand {
    pub tenant_id: TenantId,
    pub contact_id: Option<Uuid>,
    pub deal_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub struct UpdateTaskCommand {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub title: Option<String>,
    pub description: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<TaskStatus>,
    pub expected_version: i32,
}

#[derive(Debug, Clone)]
pub struct TaskCreated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub contact_id: Option<Uuid>,
    pub deal_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: TaskStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct TaskUpdated {
    pub id: Uuid,
    pub title: Option<String>,
    pub description: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<TaskStatus>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
}

use crate::error::{CinqDomainError, CinqResult};

pub fn create_task(
    cmd: CreateTaskCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> CinqResult<TaskCreated> {
    if cmd.title.trim().is_empty() {
        return Err(CinqDomainError::Validation(
            "Task title cannot be empty".to_string(),
        ));
    }
    let id = id_gen.new_uuid_v7();
    let now = clock.now().into();
    Ok(TaskCreated {
        id,
        tenant_id: cmd.tenant_id,
        contact_id: cmd.contact_id,
        deal_id: cmd.deal_id,
        assigned_to: cmd.assigned_to,
        title: cmd.title,
        description: cmd.description,
        due_date: cmd.due_date,
        status: TaskStatus::Pending,
        created_at: now,
    })
}

pub fn update_task(cmd: UpdateTaskCommand, _task: &Task, clock: &dyn Clock) -> TaskUpdated {
    let now = clock.now().into();
    TaskUpdated {
        id: cmd.id,
        title: cmd.title,
        description: cmd.description,
        due_date: cmd.due_date,
        status: cmd.status,
        updated_at: now,
        version: cmd.expected_version + 1,
    }
}
