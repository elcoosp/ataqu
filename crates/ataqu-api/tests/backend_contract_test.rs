use ataqu_api::handlers::{pause::LeaveRequestResponse, spark::ListRunsParams};
use ataqu_domain_pause::leave::{LeaveRequest, LeaveStatus, LeaveType};
use ataqu_kernel::TenantId;
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

#[test]
fn leave_response_preserves_version_and_employee_name() {
    let now = std::time::SystemTime::now();
    for version in [0, 1, 7] {
        let request = LeaveRequest {
            id: Uuid::new_v4(), tenant_id: TenantId::new(Uuid::new_v4()),
            employee_id: Uuid::new_v4(), leave_type: LeaveType::Annual,
            start_date: Utc::now().date_naive(), end_date: Utc::now().date_naive(),
            reason: None, status: LeaveStatus::Pending, reviewer_id: None,
            reviewed_at: None, created_at: now, updated_at: now, version,
        };
        let response = LeaveRequestResponse::from((request, "Alice".to_owned()));
        let value = serde_json::to_value(response).unwrap();
        assert_eq!(value["version"], version);
        assert_eq!(value["employee_name"], "Alice");
        assert_eq!(value["status"], "Pending");
    }
}

#[test]
fn workflow_run_filter_rejects_invalid_workflow_id() {
    assert!(serde_json::from_value::<ListRunsParams>(json!({"workflow_id": "not-a-uuid"})).is_err());
}

// Registration checks complement serializer/service tests without building the
// entire suite AppState (which requires every app's external dependencies).
#[test]
fn pause_bulk_leave_handlers_are_mounted() {
    let source = include_str!("../src/handlers/pause.rs");
    assert!(source.contains("\"/leave-requests/bulk-approve\""));
    assert!(source.contains("post(bulk_approve_leave_requests)"));
    assert!(source.contains("\"/leave-requests/bulk-cancel\""));
    assert!(source.contains("post(bulk_cancel_leave_requests)"));
}

#[test]
fn vista_dashboard_get_is_mounted() {
    let source = include_str!("../src/handlers/vista.rs");
    assert!(source.contains("axum::routing::get(get_dashboard)"));
    assert!(source.contains(".delete(delete_dashboard)"));
    assert!(source.contains(".put(update_dashboard)"));
    assert!(source.contains(r#""/dashboards/{id}""#));
}
