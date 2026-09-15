use crate::PauseDomainError;
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_security::Email;
use chrono::NaiveDate;
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct Employee {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub full_name: String,
    pub email: Email,
    pub phone: Option<String>,
    pub job_title: String,
    pub department: Option<String>,
    pub hire_date: NaiveDate,
    pub is_active: bool,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
    pub version: i32,
    /// Ids of completed onboarding tasks (e.g. "paperwork", "equipment", "training").
    pub onboarding_tasks: Vec<String>,
    /// Set when every onboarding task is complete.
    pub onboarding_completed_at: Option<SystemTime>,
}

#[derive(Debug, Clone)]
pub struct CreateEmployeeCommand {
    pub tenant_id: TenantId,
    pub full_name: String,
    pub email: Email,
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
    pub email: Email,
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
) -> Result<EmployeeCreatedEvent, PauseDomainError> {
    let id = id_gen.new_uuid_v7();
    let now = clock.now();
    Ok(EmployeeCreatedEvent {
        employee_id: id,
        tenant_id: cmd.tenant_id,
        full_name: cmd.full_name,
        email: cmd.email,
        phone: cmd.phone,
        job_title: cmd.job_title,
        department: cmd.department,
        hire_date: cmd.hire_date,
        created_at: now,
    })
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

/// All onboarding task ids, in display order.
pub const ONBOARDING_TASKS: &[&str] = &["paperwork", "equipment", "training"];

/// Marks a single onboarding task complete for an employee.
/// Idempotent: re-completing a task leaves the set unchanged (but still bumps updated_at).
pub fn complete_onboarding_task(
    employee: &mut Employee,
    task_id: &str,
    clock: &dyn Clock,
) -> Result<(), PauseDomainError> {
    if !ONBOARDING_TASKS.contains(&task_id) {
        return Err(PauseDomainError::Validation(format!(
            "Unknown onboarding task: {task_id}"
        )));
    }
    if !employee.onboarding_tasks.iter().any(|t| t == task_id) {
        employee.onboarding_tasks.push(task_id.to_string());
    }
    if employee.onboarding_tasks.len() >= ONBOARDING_TASKS.len()
        && employee.onboarding_completed_at.is_none()
    {
        employee.onboarding_completed_at = Some(clock.now());
    }
    employee.updated_at = clock.now();
    Ok(())
}

pub fn validate_employee_email(email: &Email) -> Result<(), PauseDomainError> {
    if !email
        .reveal(&ataqu_security::PiiAccessKey::new())
        .contains('@')
    {
        return Err(PauseDomainError::Validation(
            "Invalid email format".to_string(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod onboarding_tests {
    use super::*;
    use ataqu_kernel::TenantId;
    use std::time::{Duration, SystemTime};

    struct FixedClock(SystemTime);
    impl Clock for FixedClock {
        fn now(&self) -> SystemTime {
            self.0
        }
    }

    fn sample_employee() -> Employee {
        Employee {
            id: Uuid::new_v4(),
            tenant_id: TenantId::new(Uuid::new_v4()),
            full_name: "Test Employee".to_string(),
            email: Email::new("test@example.com".to_string()),
            phone: None,
            job_title: "Engineer".to_string(),
            department: None,
            hire_date: chrono::NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
            is_active: true,
            onboarding_tasks: vec![],
            onboarding_completed_at: None,
            created_at: SystemTime::UNIX_EPOCH,
            updated_at: SystemTime::UNIX_EPOCH,
            version: 0,
        }
    }

    #[test]
    fn complete_task_marks_progress_and_finishes() {
        let clock = FixedClock(SystemTime::UNIX_EPOCH + Duration::from_secs(1000));
        let mut emp = sample_employee();

        complete_onboarding_task(&mut emp, "paperwork", &clock).unwrap();
        assert_eq!(emp.onboarding_tasks, vec!["paperwork"]);
        assert!(emp.onboarding_completed_at.is_none());

        complete_onboarding_task(&mut emp, "equipment", &clock).unwrap();
        complete_onboarding_task(&mut emp, "training", &clock).unwrap();
        assert!(emp.onboarding_completed_at.is_some());
    }

    #[test]
    fn complete_task_is_idempotent() {
        let clock = FixedClock(SystemTime::UNIX_EPOCH + Duration::from_secs(1000));
        let mut emp = sample_employee();

        complete_onboarding_task(&mut emp, "paperwork", &clock).unwrap();
        complete_onboarding_task(&mut emp, "paperwork", &clock).unwrap();
        assert_eq!(emp.onboarding_tasks, vec!["paperwork"]);
    }

    #[test]
    fn complete_task_rejects_unknown_task() {
        let clock = FixedClock(SystemTime::UNIX_EPOCH + Duration::from_secs(1000));
        let mut emp = sample_employee();
        let err = complete_onboarding_task(&mut emp, "bogus", &clock).unwrap_err();
        assert!(matches!(
            err,
            crate::PauseDomainError::Validation(msg) if msg.contains("Unknown onboarding task")
        ));
    }
}
