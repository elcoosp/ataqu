use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::NaiveDate;
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
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
    pub version: i32,
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

#[derive(Debug, Clone)]
pub struct UpdateEmployeeCommand {
    pub tenant_id: TenantId,
    pub employee_id: Uuid,
    pub full_name: Option<String>,
    pub job_title: Option<String>,
    pub department: Option<Option<String>>,
}

#[derive(Debug, Clone)]
pub struct EmployeeCreatedEvent {
    pub employee_id: Uuid,
    pub tenant_id: TenantId,
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
        tenant_id: cmd.tenant_id,
        full_name: cmd.full_name,
        email: cmd.email,
        phone: cmd.phone,
        job_title: cmd.job_title,
        department: cmd.department,
        hire_date: cmd.hire_date,
        created_at: now,
    }
}

pub fn update_employee(employee: &mut Employee, cmd: UpdateEmployeeCommand, clock: &dyn Clock) {
    if let Some(name) = cmd.full_name {
        employee.full_name = name;
    }
    if let Some(title) = cmd.job_title {
        employee.job_title = title;
    }
    if let Some(dept) = cmd.department {
        employee.department = dept;
    }
    employee.updated_at = clock.now();
}

pub fn deactivate_employee(employee: &mut Employee, clock: &dyn Clock) {
    employee.is_active = false;
    employee.updated_at = clock.now();
}
