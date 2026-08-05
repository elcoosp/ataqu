use crate::AppState;
use crate::error::ApiResponseError;
use ataqu_kernel::TenantId;
use axum::extract::{FromRequestParts, Request, State};
use axum::http::request::Parts;
use axum::middleware::Next;
use axum::response::Response;
use jsonwebtoken::{DecodingKey, Validation, decode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,
    pub tenant_id: Uuid,
    pub email: String,
    pub roles: Vec<String>,
    pub exp: usize,
    pub iat: usize,
    pub token_type: String,
}

#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: Uuid,
    pub tenant_id: TenantId,
    pub email: String,
    pub roles: Vec<String>,
}

impl AuthContext {
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }
}

impl<S> FromRequestParts<S> for AuthContext
where
    S: Send + Sync,
{
    type Rejection = ApiResponseError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts.extensions.get::<AuthContext>().cloned().ok_or_else(|| {
            ApiResponseError::unauthorized("Missing or invalid Authorization header or API Key")
        })
    }
}

pub async fn auth_middleware(
    State(app_state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, ApiResponseError> {
    if let Some(auth_header) = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
    {
        if let Ok(token_data) = decode::<JwtClaims>(
            auth_header,
            &DecodingKey::from_secret(&app_state.jwt_secret),
            &Validation::default(),
        ) {
            let user_id = Uuid::parse_str(&token_data.claims.sub)
                .map_err(|_| ApiResponseError::unauthorized("Invalid user ID in token"))?;
            let auth_ctx = AuthContext {
                user_id,
                tenant_id: TenantId::new(token_data.claims.tenant_id),
                email: token_data.claims.email,
                roles: token_data.claims.roles,
            };
            req.extensions_mut().insert(auth_ctx);
            return Ok(next.run(req).await);
        }
    }

    if let Some(api_key) = req.headers().get("X-API-Key").and_then(|v| v.to_str().ok()) {
        if let Ok(user) = app_state.aegis_service.validate_api_key(api_key).await {
            let auth_ctx = AuthContext {
                user_id: user.id,
                tenant_id: user.tenant_id,
                email: user.email.as_ref().to_string(),
                roles: vec![user.role],
            };
            req.extensions_mut().insert(auth_ctx);
            return Ok(next.run(req).await);
        }
    }

    Err(ApiResponseError::unauthorized(
        "Missing or invalid Authorization header or API Key",
    ))
}
