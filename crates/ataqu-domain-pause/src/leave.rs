//! Leave domain: pure functions for leave requests.

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::time::SystemTime;
use uuid::Uuid;

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
pub enum LeaveStatus {
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

#[derive(Debug, Clone)]
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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct LeaveStatusChanged {
    pub leave_request_id: Uuid,
    pub old_status: LeaveStatus,
    pub new_status: LeaveStatus,
    pub reviewer_id: Uuid,
    pub changed_at: SystemTime,
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
) -> LeaveStatusChanged {
    let old = request.status;
    request.status = LeaveStatus::Approved;
    request.reviewer_id = Some(reviewer_id);
    request.reviewed_at = Some(clock.now());
    request.updated_at = clock.now();
    LeaveStatusChanged {
        leave_request_id: request.id,
        old_status: old,
        new_status: LeaveStatus::Approved,
        reviewer_id,
        changed_at: request.updated_at,
    }
}

pub fn reject_leave(
    request: &mut LeaveRequest,
    reviewer_id: Uuid,
    clock: &dyn Clock,
) -> LeaveStatusChanged {
    let old = request.status;
    request.status = LeaveStatus::Rejected;
    request.reviewer_id = Some(reviewer_id);
    request.reviewed_at = Some(clock.now());
    request.updated_at = clock.now();
    LeaveStatusChanged {
        leave_request_id: request.id,
        old_status: old,
        new_status: LeaveStatus::Rejected,
        reviewer_id,
        changed_at: request.updated_at,
    }
}
