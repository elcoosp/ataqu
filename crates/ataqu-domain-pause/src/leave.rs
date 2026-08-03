//! Leave domain: pure functions for leave requests.

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct LeaveRequest {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: SystemTime,
    pub end_date: SystemTime,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

#[derive(Debug, Clone)]
pub struct RequestLeaveCommand {
    pub tenant_id: TenantId,
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: SystemTime,
    pub end_date: SystemTime,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct LeaveRequestedEvent {
    pub leave_request_id: Uuid,
    pub tenant_id: Uuid,
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: SystemTime,
    pub end_date: SystemTime,
    pub reason: Option<String>,
    pub created_at: SystemTime,
}

pub fn request_leave(
    cmd: RequestLeaveCommand,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
) -> LeaveRequestedEvent {
    let id = id_gen.new_uuid_v7();
    let now = clock.now();
    LeaveRequestedEvent {
        leave_request_id: id,
        tenant_id: cmd.tenant_id.as_uuid(),
        employee_id: cmd.employee_id,
        leave_type: cmd.leave_type,
        start_date: cmd.start_date,
        end_date: cmd.end_date,
        reason: cmd.reason,
        created_at: now,
    }
}
