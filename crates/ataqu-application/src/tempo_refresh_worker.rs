//! Tempo OAuth token refresh worker.
use reqwest::Client;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use chrono::{Utc, Duration};
use tracing::info;

pub async fn refresh_expiring_tokens(
    db: DatabaseConnection,
    _client: Client,
) -> Result<(), String> {
    let now = Utc::now();
    let threshold = now + Duration::hours(1);

    let sql = r#"
        SELECT id, tenant_id, oauth_refresh_token, oauth_token_expires_at
        FROM collab_ops.bookings
        WHERE oauth_refresh_token IS NOT NULL
          AND oauth_token_expires_at <= $1
    "#;
    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        sql,
        [threshold.into()],
    );
    let rows = db.query_all_raw(stmt)
        .await
        .map_err(|e| format!("DB query failed: {}", e))?;

    if rows.is_empty() {
        return Ok(());
    }

    info!("Found {} bookings with expiring tokens", rows.len());

    for row in rows {
        let _booking_id: uuid::Uuid = row.try_get("", "id")
            .map_err(|e| format!("Missing id: {}", e))?;
        let _refresh_token: Option<String> = row.try_get("", "oauth_refresh_token")
            .unwrap_or(None);
        // TODO: implement actual token refresh with provider endpoint
    }

    Ok(())
}
