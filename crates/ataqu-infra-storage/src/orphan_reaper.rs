//! S3 Orphan Reaper – deletes uploaded files not linked to any entity after 24h.
use crate::s3_service::S3Service;
use chrono::{DateTime, Utc, Duration};
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use tracing::{info, error};

pub async fn reap_orphans(
    s3: &S3Service,
    db: &DatabaseConnection,
) -> Result<(), String> {
    const PREFIX: &str = "uploads/";
    const TTL_HOURS: i64 = 24;

    info!("Starting S3 orphan reaper scan");

    let objects = s3.list_objects(PREFIX).await.map_err(|e| format!("S3 list failed: {}", e))?;

    let mut deleted = 0;
    let mut kept = 0;

    for key in objects {
        let stmt = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT 1 FROM core.file_references WHERE file_key = $1 AND status = 'referenced'",
            [key.clone().into()],
        );
        let rows = db.query_all_raw(stmt).await.map_err(|e| format!("DB query failed: {}", e))?;

        if !rows.is_empty() {
            kept += 1;
            continue;
        }

        let stmt2 = Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT created_at FROM core.file_references WHERE file_key = $1 AND status = 'pending'",
            [key.clone().into()],
        );
        let row = db.query_one_raw(stmt2).await.map_err(|e| format!("DB query failed: {}", e))?;

        if let Some(row) = row {
            let created_at: DateTime<Utc> = row
                .try_get("", "created_at")
                .map_err(|e| format!("Failed to parse timestamp: {}", e))?;
            let age = Utc::now().signed_duration_since(created_at);
            let age_hours = age.num_hours();
            if age_hours >= TTL_HOURS {
                if let Err(e) = s3.delete_object(&key).await {
                    error!("Failed to delete orphan {}: {}", key, e);
                } else {
                    deleted += 1;
                    info!("Deleted orphan S3 object: {}", key);
                    let update_stmt = Statement::from_sql_and_values(
                        DbBackend::Postgres,
                        "UPDATE core.file_references SET status = 'deleted' WHERE file_key = $1",
                        [key.into()],
                    );
                    let _ = db.execute_raw(update_stmt).await;
                }
            }
        }
    }

    info!("Orphan reaper finished: deleted {}, kept {}", deleted, kept);
    Ok(())
}
