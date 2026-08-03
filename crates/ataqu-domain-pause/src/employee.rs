//! Employee domain: pure functions for employee management.

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Employee {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

#[derive(Debug, Clone)]
pub struct CreateEmployeeCommand {
    pub tenant_id: TenantId,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct EmployeeCreatedEvent {
    pub employee_id: Uuid,
    pub tenant_id: Uuid,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub created_at: SystemTime,
}

pub fn create_employee(
    cmd: CreateEmployeeCommand,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
) -> EmployeeCreatedEvent {
    let id = id_gen.new_uuid_v7();
    let now = clock.now();
    EmployeeCreatedEvent {
        employee_id: id,
        tenant_id: cmd.tenant_id.as_uuid(),
        first_name: cmd.first_name,
        last_name: cmd.last_name,
        email: cmd.email,
        created_at: now,
    }
}
