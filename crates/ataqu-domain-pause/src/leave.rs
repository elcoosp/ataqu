use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::NaiveDate;
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum LeaveType {
    Annual,
    Sick,
    Personal,
    Unpaid,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum LeaveStatus {
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LeaveRequest {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub employee_id: Uuid,
    pub leave_type: LeaveType,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub reason: Option<String>,
    pub status: LeaveStatus,
    pub reviewer_id: Option<Uuid>,
    pub reviewed_at: Option<SystemTime>,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
    pub version: i32,
}

#[derive(Debug, Clone)]
pub struct RequestLeaveCommand {
    pub tenant_id: TenantId,
    pub employee_id: Uuid,
    pub leave_type: LeaveType,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LeaveRequestedEvent {
    pub leave_request_id: Uuid,
    pub tenant_id: TenantId,
    pub employee_id: Uuid,
    pub leave_type: LeaveType,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub reason: Option<String>,
    pub created_at: SystemTime,
}

pub fn request_leave(
    cmd: RequestLeaveCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> LeaveRequestedEvent {
    let id = id_gen.new_uuid_v7();
    let now = clock.now();
    LeaveRequestedEvent {
        leave_request_id: id,
        tenant_id: cmd.tenant_id,
        employee_id: cmd.employee_id,
        leave_type: cmd.leave_type,
        start_date: cmd.start_date,
        end_date: cmd.end_date,
        reason: cmd.reason,
        created_at: now,
    }
}

pub fn approve_leave(
    request: &mut LeaveRequest,
    reviewer_id: Uuid,
    clock: &dyn Clock,
) -> LeaveStatus {
    request.status = LeaveStatus::Approved;
    request.reviewer_id = Some(reviewer_id);
    request.reviewed_at = Some(clock.now());
    request.updated_at = clock.now();
    request.status
}

pub fn reject_leave(
    request: &mut LeaveRequest,
    reviewer_id: Uuid,
    clock: &dyn Clock,
) -> LeaveStatus {
    request.status = LeaveStatus::Rejected;
    request.reviewer_id = Some(reviewer_id);
    request.reviewed_at = Some(clock.now());
    request.updated_at = clock.now();
    request.status
}

pub fn cancel_leave(
    request: &mut LeaveRequest,
    reviewer_id: Uuid,
    clock: &dyn Clock,
) -> LeaveStatus {
    request.status = LeaveStatus::Cancelled;
    request.reviewer_id = Some(reviewer_id);
    request.reviewed_at = Some(clock.now());
    request.updated_at = clock.now();
    request.status
}
