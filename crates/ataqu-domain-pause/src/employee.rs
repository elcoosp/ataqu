//! Employee domain: pure functions for employee management.

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use std::time::SystemTime;
use uuid::Uuid;
use chrono::NaiveDate;

#[derive(Debug, Clone)]
pub struct Employee {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub job_title: String,
    pub department: Option<String>,
    pub hire_date: NaiveDate,
    pub is_active: bool,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

#[derive(Debug, Clone)]
pub struct CreateEmployeeCommand {
    pub tenant_id: TenantId,
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub job_title: String,
    pub department: Option<String>,
    pub hire_date: NaiveDate,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct EmployeeCreatedEvent {
    pub employee_id: Uuid,
    pub tenant_id: Uuid,
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub job_title: String,
    pub department: Option<String>,
    pub hire_date: NaiveDate,
    pub created_at: SystemTime,
}

pub fn create_employee(
    cmd: CreateEmployeeCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> EmployeeCreatedEvent {
    let id = id_gen.new_uuid_v7();
    let now = clock.now();
    EmployeeCreatedEvent {
        employee_id: id,
        tenant_id: cmd.tenant_id.as_uuid(),
        full_name: cmd.full_name,
        email: cmd.email,
        phone: cmd.phone,
        job_title: cmd.job_title,
        department: cmd.department,
        hire_date: cmd.hire_date,
        created_at: now,
    }
}
