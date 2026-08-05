use crate::types::Email;
use ataqu_kernel::TenantId;
use serde::{Deserialize, Serialize};
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SsoProvider {
    Google,
    Microsoft,
}

#[derive(Debug, Clone)]
pub struct SsoConfig {
    pub google_client_id: String,
    pub google_client_secret: String,
    pub google_redirect_uri: String,
    pub microsoft_client_id: String,
    pub microsoft_client_secret: String,
    pub microsoft_redirect_uri: String,
}

#[derive(Debug, Clone)]
pub struct StartSsoCommand {
    pub provider: SsoProvider,
    pub state: String,
}

#[derive(Debug, Clone)]
pub struct SsoRedirect {
    pub url: String,
    pub state: String,
}

#[derive(Debug, Clone)]
pub struct SsoCallback {
    pub provider: SsoProvider,
    pub code: String,
    pub state: String,
}

#[derive(Debug, Clone)]
pub struct SsoUserInfo {
    pub provider: SsoProvider,
    pub provider_user_id: String,
    pub email: Email,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SsoLink {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tenant_id: TenantId,
    pub provider: SsoProvider,
    pub provider_user_id: String,
    pub created_at: SystemTime,
}

pub fn build_authorization_url(
    provider: &SsoProvider,
    config: &SsoConfig,
    state: &str,
) -> SsoRedirect {
    let url = match provider {
        SsoProvider::Google => format!(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid+email+profile&state={}",
            config.google_client_id,
            urlencoding::encode(&config.google_redirect_uri),
            state
        ),
        SsoProvider::Microsoft => format!(
            "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id={}&redirect_uri={}&response_type=code&scope=openid+email+profile&state={}",
            config.microsoft_client_id,
            urlencoding::encode(&config.microsoft_redirect_uri),
            state
        ),
    };
    SsoRedirect {
        url,
        state: state.to_string(),
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SsoError {
    #[error("SSO provider error: {0}")]
    Provider(String),
    #[error("Token exchange failed: {0}")]
    TokenExchange(String),
    #[error("Invalid state")]
    InvalidState,
    #[error("Database error: {0}")]
    Database(String),
}
