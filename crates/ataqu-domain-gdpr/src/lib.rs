pub mod registry;
pub mod saga;

use serde::{Deserialize, Serialize};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GdprStep {
    DeactivateUsers,
    AnonymizePII,
    DeleteS3Files,
    PurgeTables,
    Complete,
}

impl GdprStep {
    pub fn next(&self) -> Option<Self> {
        match self {
            GdprStep::DeactivateUsers => Some(GdprStep::AnonymizePII),
            GdprStep::AnonymizePII => Some(GdprStep::DeleteS3Files),
            GdprStep::DeleteS3Files => Some(GdprStep::PurgeTables),
            GdprStep::PurgeTables => Some(GdprStep::Complete),
            GdprStep::Complete => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            GdprStep::DeactivateUsers => "deactivate_users",
            GdprStep::AnonymizePII => "anonymize_pii",
            GdprStep::DeleteS3Files => "delete_s3_files",
            GdprStep::PurgeTables => "purge_tables",
            GdprStep::Complete => "complete",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GdprSaga {
    pub tenant_id: Uuid,
    pub step: GdprStep,
    pub retry_count: u32,
    pub manifest: Vec<String>,
    pub trace_id: Uuid,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

impl GdprSaga {
    pub fn new(tenant_id: Uuid, trace_id: Uuid) -> Self {
        let now = SystemTime::now();
        Self {
            tenant_id,
            step: GdprStep::DeactivateUsers,
            retry_count: 0,
            manifest: Vec::new(),
            trace_id,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn is_complete(&self) -> bool {
        matches!(self.step, GdprStep::Complete)
    }
}
