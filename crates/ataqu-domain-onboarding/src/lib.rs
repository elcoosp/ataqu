use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardingStatus {
    pub tenant_id: Uuid,
    pub tasks_completed: Vec<String>,
    pub last_active_at: DateTime<Utc>,
    pub progress_percentage: f32,
}

pub const TOTAL_TASKS: usize = 5;

pub fn calculate_progress(tasks_completed: &[String]) -> f32 {
    (tasks_completed.len() as f32 / TOTAL_TASKS as f32) * 100.0
}

pub fn is_inactive(last_active: DateTime<Utc>, now: DateTime<Utc>, threshold_days: i64) -> bool {
    let duration = now - last_active;
    duration.num_days() >= threshold_days
}
