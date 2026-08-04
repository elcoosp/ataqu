use serde::{Deserialize, Serialize};

/// Command to create a new user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUser {
    pub tenant_id: uuid::Uuid,
    pub email: String,
    pub password: String,
    pub name: Option<String>,
}

/// Event emitted when a user is successfully created.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserCreated {
    pub user_id: String,
    pub email: String,
    pub name: Option<String>,
}

/// Command to authenticate a user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Authenticate {
    pub email: String,
    pub password: String,
}

/// Command to set up multi‑factor authentication for a user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MfaSetup {
    pub user_id: String,
    pub method: String, // e.g., "totp"
    pub secret: String,
}
