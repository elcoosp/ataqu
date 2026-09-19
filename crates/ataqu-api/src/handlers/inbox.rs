//! Cross-app Activity Inbox (brainstorm §5.5 F1).
//!
//! One notification surface for the whole suite. The backend signals already
//! exist per app (vault low stock, spark failed runs / pending approvals, pause
//! pending leave, per-user changelog unread); this module is the missing
//! fan-out bridge that merges them into a single ranked feed so the frontend
//! needs exactly one request instead of eight.
//!
//! Deep links are relative to the router's own route table, so `Enter` in the
//! inbox lands on the owning record rather than a redirect.

use axum::{Json, Router, extract::State, http::StatusCode, routing::get};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::error::ApiResult;
use crate::middleware::AuthContext;
use ataqu_domain_pause::leave::LeaveStatus;
use ataqu_domain_spark::workflow::WorkflowRunStatus;

/// How urgently an inbox item wants attention. Ranks drive feed ordering.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InboxSeverity {
    Info,
    Warning,
    Critical,
}

impl InboxSeverity {
    /// Higher rank sorts first. Explicit ranks (rather than deriving `Ord` on
    /// the variants) keep the wire format decoupled from ordering.
    pub fn rank(&self) -> u8 {
        match self {
            InboxSeverity::Info => 0,
            InboxSeverity::Warning => 1,
            InboxSeverity::Critical => 2,
        }
    }
}

/// A single inbox entry, normalized across every producing app.
#[derive(Debug, Clone, Serialize)]
pub struct InboxItem {
    pub id: String,
    pub kind: String,
    pub app: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub severity: InboxSeverity,
    pub created_at: DateTime<Utc>,
    pub deep_link: String,
}

/// Orders the feed: most urgent first, newest first within a severity.
///
/// Grouping by severity (rather than strict recency) is the point of the
/// inbox — a ninety-minute-old failed workflow must not sit below a changelog
/// entry that landed a minute ago.
pub fn sort_inbox_items(items: &mut [InboxItem]) {
    items.sort_by(|a, b| {
        b.severity
            .rank()
            .cmp(&a.severity.rank())
            .then_with(|| b.created_at.cmp(&a.created_at))
    });
}

#[derive(Debug, Deserialize, Default)]
pub struct InboxQuery {
    pub limit: Option<usize>,
}

const DEFAULT_LIMIT: usize = 50;
const LOW_STOCK_THRESHOLD: i64 = 5;

/// `GET /api/v1/inbox` — fans out across the producing apps and returns one
/// ranked feed. Individual producer failures degrade to "no items from that
/// app" instead of failing the whole inbox: one unavailable service must not
/// blank the user's notifications.
pub async fn get_inbox(
    State(state): State<AppState>,
    auth: AuthContext,
    axum::extract::Query(query): axum::extract::Query<InboxQuery>,
) -> ApiResult<(StatusCode, Json<Vec<InboxItem>>)> {
    let mut items: Vec<InboxItem> = Vec::new();

    // --- Vault: low stock -------------------------------------------------
    if let Ok(variants) = state
        .vault_service
        .find_low_stock_variants(auth.tenant_id, LOW_STOCK_THRESHOLD)
        .await
    {
        for v in variants {
            items.push(InboxItem {
                id: format!("vault:variant:{}", v.id),
                kind: "low_stock".to_string(),
                app: "vault".to_string(),
                title: format!("Low stock: {}", v.sku),
                subtitle: Some(format!(
                    "{} left (threshold {})",
                    v.stock_quantity, v.low_stock_threshold
                )),
                severity: InboxSeverity::Warning,
                created_at: DateTime::<Utc>::from(v.updated_at),
                deep_link: format!("/vault/products/{}", v.product_id),
            });
        }
    }

    // --- Spark: failed runs ----------------------------------------------
    if let Ok(runs) = state.spark_service.list_runs(auth.tenant_id, 50, 0).await {
        for run in runs
            .into_iter()
            .filter(|r| r.status == WorkflowRunStatus::Failed)
        {
            items.push(InboxItem {
                id: format!("spark:run:{}", run.id),
                kind: "run_failed".to_string(),
                app: "spark".to_string(),
                title: "Workflow run failed".to_string(),
                subtitle: Some(format!("Workflow {}", run.workflow_id)),
                severity: InboxSeverity::Critical,
                created_at: DateTime::<Utc>::from(run.created_at),
                deep_link: format!("/spark/runs/{}", run.id),
            });
        }
    }

    // --- Spark: pending approvals ----------------------------------------
    if let Ok(approvals) = state
        .spark_service
        .list_pending_approvals(auth.tenant_id, 50)
        .await
    {
        for a in approvals {
            items.push(InboxItem {
                id: format!("spark:approval:{}", a.id),
                kind: "approval_pending".to_string(),
                app: "spark".to_string(),
                title: format!("Approval needed: {}", a.approver_role),
                subtitle: Some(format!("Workflow {}", a.workflow_id)),
                severity: InboxSeverity::Warning,
                created_at: a.created_at,
                deep_link: format!("/spark/runs/{}", a.run_id),
            });
        }
    }

    // --- Pause: pending leave requests ------------------------------------
    if let Ok(requests) = state
        .pause_service
        .list_leave_requests(&auth.tenant_id, 100, 0)
        .await
    {
        for r in requests
            .into_iter()
            .filter(|r| r.status == LeaveStatus::Pending)
        {
            items.push(InboxItem {
                id: format!("pause:leave:{}", r.id),
                kind: "leave_pending".to_string(),
                app: "pause".to_string(),
                title: "Leave request awaiting review".to_string(),
                subtitle: Some(format!("{} → {}", r.start_date, r.end_date)),
                severity: InboxSeverity::Warning,
                created_at: DateTime::<Utc>::from(r.created_at),
                deep_link: "/pause/approvals".to_string(),
            });
        }
    }

    // --- Changelog: per-user unread ---------------------------------------
    if let Ok(entries) = state
        .changelog_service
        .list_unread_entries(auth.user_id, 20)
        .await
    {
        for e in entries {
            items.push(InboxItem {
                id: format!("changelog:{}", e.id),
                kind: "changelog".to_string(),
                app: "changelog".to_string(),
                title: e.title,
                subtitle: Some(e.version),
                severity: if e.breaking_change {
                    InboxSeverity::Warning
                } else {
                    InboxSeverity::Info
                },
                created_at: e.created_at,
                deep_link: "/whats-new".to_string(),
            });
        }
    }

    sort_inbox_items(&mut items);
    items.truncate(query.limit.unwrap_or(DEFAULT_LIMIT));

    Ok((StatusCode::OK, Json(items)))
}

/// Authenticated inbox routes.
pub fn inbox_routes() -> Router<AppState> {
    Router::new().route("/inbox", get(get_inbox))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn severity_round_trips_to_its_wire_string() {
        for (sev, wire) in [
            (InboxSeverity::Info, "info"),
            (InboxSeverity::Warning, "warning"),
            (InboxSeverity::Critical, "critical"),
        ] {
            assert_eq!(serde_json::to_value(sev).unwrap(), serde_json::json!(wire));
        }
    }

    #[test]
    fn empty_feed_sorts_without_panicking() {
        let mut items: Vec<InboxItem> = Vec::new();
        sort_inbox_items(&mut items);
        assert!(items.is_empty());
    }
}
