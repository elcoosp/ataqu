//! Stub for Tempo OAuth token refresh worker. Implementation deferred.
use reqwest::Client;
use sea_orm::DatabaseConnection;

pub async fn refresh_expiring_tokens(_db: DatabaseConnection, _client: Client) -> Result<(), String> {
    // TODO: Implement refresh logic
    Ok(())
}
