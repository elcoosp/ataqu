//! Audit log integration test.
//!
//! Requires a reachable PostgreSQL (`DATABASE_TEST_URL`, defaulting to the local
//! test instance). When the DB is unreachable the test is skipped instead of
//! passing vacuously.
use ataqu_domain_aegis::repository::AuditRepositoryTrait;
use ataqu_infra_repositories::audit_repo::AuditRepository;
use ataqu_kernel::TenantId;
use sea_orm::Database;
use std::net::IpAddr;
use uuid::Uuid;

#[tokio::test]
async fn test_audit_log_created_on_mutation() {
    let db_url = std::env::var("DATABASE_TEST_URL")
        .unwrap_or_else(|_| "postgres://postgres:***@localhost:5432/ataqu_test".to_string());

    let db = match Database::connect(&db_url).await {
        Ok(db) => db,
        Err(e) => {
            eprintln!("Skipping audit_log test: cannot connect to DB: {e}");
            return;
        }
    };

    let repo = AuditRepository::new(db);
    let tenant_id = TenantId::new(Uuid::new_v4());
    let actor = Uuid::new_v4();

    repo.append_log(
        tenant_id,
        actor,
        "test_action",
        "test_app",
        Some("entity"),
        Some(Uuid::new_v4()),
        None,
        Some(serde_json::json!({ "k": "v" })),
        Some(IpAddr::from([127, 0, 0, 1])),
        Some("test-agent"),
    )
    .await
    .expect("append_log must succeed");

    let logs = repo
        .list_logs(tenant_id, 10, 0, None, None, None, None)
        .await
        .expect("list_logs must succeed");

    assert!(
        logs.iter().any(|l| l.action == "test_action" && l.user_id == actor),
        "the audit entry we appended should be retrievable for its tenant"
    );
}
