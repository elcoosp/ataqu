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

pub mod registry;
pub mod saga;

pub use registry::GdprRegistry;

#[cfg(test)]
mod tests {
    use super::*;

    // This test ensures the registry covers all tables that have tenant_id.
    // It uses a static list of expected tables (should be kept in sync).
    #[test]
    fn registry_covers_all_tables() {
        let expected = vec![
            "core.users",
            "collab_crm.contacts",
            "collab_crm.deals",
            "collab_crm.activities",
            "collab_crm.tasks",
            "collab_crm.pipeline_stages",
            "collab_crm.establishments",
            "collab_ops.employees",
            "collab_ops.leave_requests",
            "collab_ops.documents",
            "collab_ops.databases",
            "collab_ops.blocks",
            "collab_ops.relations",
            "collab_ops.templates",
            "collab_ops.document_versions",
            "collab_ops.forms",
            "collab_ops.responses",
            "collab_ops.bookings",
            "collab_ops.event_types",
            "collab_ops.availability_slots",
            "vault.products",
            "vault.variants",
            "vault.movements",
            "vault.reservations",
            "vault.warehouses",
            "vault.shopify_integrations",
            "vault.shopify_sync_logs",
            "dial.channels",
            "dial.messages",
            "dial.threads",
            "dial.mentions",
            "dial.reactions",
            "dial.presence",
            "dial.tickets",
        ];
        let registry = GdprRegistry::new();
        let actual: Vec<String> = registry
            .tables
            .iter()
            .map(|t| format!("{}.{}", t.schema, t.table))
            .collect();
        for table in expected {
            assert!(
                actual.contains(&table.to_string()),
                "Table {} is missing from registry",
                table
            );
        }
    }
}
