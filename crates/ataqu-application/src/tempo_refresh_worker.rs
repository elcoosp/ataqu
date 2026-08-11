//! Tempo OAuth token refresh worker.
use reqwest::Client;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use chrono::{Utc, Duration};
use tracing::{info, error};

#[derive(Debug)]
pub enum Provider {
    Google,
    Microsoft,
}

pub async fn refresh_expiring_tokens(
    db: DatabaseConnection,
    client: Client,
) -> Result<(), String> {
    let now = Utc::now();
    let threshold = now + Duration::hours(1);

    let sql = r#"
        SELECT id, tenant_id, oauth_refresh_token, oauth_token_expires_at, provider
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
        let booking_id: uuid::Uuid = row.try_get("", "id")
            .map_err(|e| format!("Missing id: {}", e))?;
        let refresh_token: String = row.try_get("", "oauth_refresh_token")
            .map_err(|e| format!("Missing refresh_token: {}", e))?;
        let provider_str: String = row.try_get("", "provider")
            .unwrap_or_else(|_| "google".to_string());
        let provider = match provider_str.as_str() {
            "google" => Provider::Google,
            "microsoft" => Provider::Microsoft,
            _ => {
                error!("Unknown provider: {}", provider_str);
                continue;
            }
        };

        match refresh_token_for_provider(&client, provider, &refresh_token).await {
            Ok((new_access_token, new_expires_in)) => {
                let new_expiry = Utc::now() + Duration::seconds(new_expires_in as i64);
                let update_stmt = Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    "UPDATE collab_ops.bookings SET oauth_access_token = $1, oauth_token_expires_at = $2 WHERE id = $3",
                    [new_access_token.into(), new_expiry.into(), booking_id.into()],
                );
                db.execute_raw(update_stmt).await
                    .map_err(|e| format!("Failed to update booking: {}", e))?;
                info!("Refreshed token for booking {}", booking_id);
            }
            Err(e) => {
                error!("Failed to refresh token for booking {}: {}", booking_id, e);
            }
        }
    }

    Ok(())
}

async fn refresh_token_for_provider(
    client: &Client,
    provider: Provider,
    refresh_token: &str,
) -> Result<(String, i64), String> {
    let (url, client_id, client_secret) = match provider {
        Provider::Google => (
            "https://oauth2.googleapis.com/token",
            std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
            std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default(),
        ),
        Provider::Microsoft => (
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            std::env::var("MICROSOFT_CLIENT_ID").unwrap_or_default(),
            std::env::var("MICROSOFT_CLIENT_SECRET").unwrap_or_default(),
        ),
    };

    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
        ("client_id", &client_id),
        ("client_secret", &client_secret),
    ];

    let resp = client
        .post(url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("OAuth error: {}", text));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| format!("JSON parse error: {}", e))?;
    let access_token = json["access_token"].as_str().ok_or("Missing access_token")?.to_string();
    let expires_in = json["expires_in"].as_i64().unwrap_or(3600);
    Ok((access_token, expires_in))
}
