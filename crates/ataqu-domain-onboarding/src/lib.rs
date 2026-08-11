//! Onboarding activation tracking (ADR-036).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// All possible activation tasks.
pub const TASKS: &[&str] = &[
    "import_data",
    "enable_integration",
    "create_workflow",
    "invite_team",
    "create_dashboard",
];

/// Onboarding status for a tenant.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardingStatus {
    pub tenant_id: Uuid,
    pub tasks_completed: Vec<String>,
    pub last_active_at: DateTime<Utc>,
    pub progress_percentage: f32,
}

/// Pure function to calculate progress percentage.
pub fn calculate_progress(tasks_completed: &[String]) -> f32 {
    let total = TASKS.len() as f32;
    let done = tasks_completed
        .iter()
        .filter(|t| TASKS.contains(&t.as_str()))
        .count() as f32;
    (done / total) * 100.0
}

/// Pure function to check if tenant is inactive.
pub fn is_inactive(last_active: DateTime<Utc>, now: DateTime<Utc>, threshold_days: i64) -> bool {
    let duration = now - last_active;
    duration.num_days() >= threshold_days
}

/// Complete a task and return new status.
pub fn complete_task(
    mut status: OnboardingStatus,
    task_id: String,
    now: DateTime<Utc>,
) -> OnboardingStatus {
    if !status.tasks_completed.contains(&task_id) {
        status.tasks_completed.push(task_id);
    }
    status.last_active_at = now;
    status.progress_percentage = calculate_progress(&status.tasks_completed);
    status
}
