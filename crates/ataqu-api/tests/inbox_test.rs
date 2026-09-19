use ataqu_api::handlers::inbox::{InboxItem, InboxSeverity, sort_inbox_items};
use chrono::{Duration, Utc};

fn item(id: &str, severity: InboxSeverity, minutes_ago: i64) -> InboxItem {
    InboxItem {
        id: id.to_string(),
        kind: "test".to_string(),
        app: "cinq".to_string(),
        title: format!("item {id}"),
        subtitle: None,
        severity,
        created_at: Utc::now() - Duration::minutes(minutes_ago),
        deep_link: "/cinq/contacts".to_string(),
    }
}

#[test]
fn critical_signals_surface_above_informational_ones() {
    let mut items = vec![
        item("info-newest", InboxSeverity::Info, 1),
        item("critical-older", InboxSeverity::Critical, 90),
        item("warning", InboxSeverity::Warning, 30),
    ];
    sort_inbox_items(&mut items);
    let order: Vec<&str> = items.iter().map(|i| i.id.as_str()).collect();
    assert_eq!(order, vec!["critical-older", "warning", "info-newest"]);
}

#[test]
fn newest_first_within_the_same_severity() {
    let mut items = vec![
        item("old", InboxSeverity::Warning, 120),
        item("middle", InboxSeverity::Warning, 45),
        item("new", InboxSeverity::Warning, 3),
    ];
    sort_inbox_items(&mut items);
    let order: Vec<&str> = items.iter().map(|i| i.id.as_str()).collect();
    assert_eq!(order, vec!["new", "middle", "old"]);
}

#[test]
fn severity_ranks_are_ordered_critical_then_warning_then_info() {
    assert!(InboxSeverity::Critical.rank() > InboxSeverity::Warning.rank());
    assert!(InboxSeverity::Warning.rank() > InboxSeverity::Info.rank());
}

/// Source guard: the inbox must be mounted on the authenticated router, and
/// the module must be exported, so the frontend's GET /api/v1/inbox resolves.
/// (Mirrors the source-guard convention used elsewhere in this crate's tests.)
#[test]
fn inbox_routes_are_mounted() {
    let lib = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/src/lib.rs")).unwrap();
    assert!(
        lib.contains("/api/v1/inbox"),
        "expected the inbox route to be registered in lib.rs"
    );
    assert!(
        lib.contains("handlers::inbox::inbox_routes"),
        "expected the inbox router to be mounted on the authenticated router"
    );
    let mods =
        std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/src/handlers/mod.rs"))
            .unwrap();
    assert!(
        mods.contains("pub mod inbox;"),
        "expected the inbox handler module to be exported"
    );
}
