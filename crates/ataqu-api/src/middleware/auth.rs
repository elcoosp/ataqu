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
    pub email: ataqu_security::Email,
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
        parts
            .extensions
            .get::<AuthContext>()
            .cloned()
            .ok_or_else(|| {
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
        if app_state.jwt_blocklist.contains_key(auth_header) {
            return Err(ApiResponseError::unauthorized("Token has been revoked"));
        }

        if let Ok(token_data) = decode::<JwtClaims>(
            auth_header,
            &DecodingKey::from_secret(&app_state.jwt_secret),
            &Validation::default(),
        ) {
            if token_data.claims.token_type != "access" {
                return Err(ApiResponseError::unauthorized("Invalid token type"));
            }
            let user_id = Uuid::parse_str(&token_data.claims.sub)
                .map_err(|_| ApiResponseError::unauthorized("Invalid user ID in token"))?;
            let auth_ctx = AuthContext {
                user_id,
                tenant_id: TenantId::new(token_data.claims.tenant_id),
                email: ataqu_security::Email::new(token_data.claims.email),
                roles: token_data.claims.roles,
            };
            req.extensions_mut().insert(auth_ctx);
            return Ok(next.run(req).await);
        }
    }

    if let Some(api_key) = req.headers().get("X-API-Key").and_then(|v| v.to_str().ok()) {
        if let Ok(api_key_data) = app_state.aegis_service.validate_api_key_data(api_key).await {
            // Basic scope enforcement: require "read" for GET, "write" for others
            let needs_write = req.method() != axum::http::Method::GET;
            if needs_write
                && !api_key_data
                    .scopes
                    .iter()
                    .any(|s| s == "write" || s == "admin")
            {
                return Err(ApiResponseError::Forbidden(
                    "API key lacks write scope".to_string(),
                ));
            }
            if !needs_write
                && !api_key_data
                    .scopes
                    .iter()
                    .any(|s| s == "read" || s == "write" || s == "admin")
            {
                return Err(ApiResponseError::Forbidden(
                    "API key lacks read scope".to_string(),
                ));
            }

            let auth_ctx = AuthContext {
                user_id: api_key_data.user_id,
                tenant_id: api_key_data.tenant_id,
                email: api_key_data.email,
                roles: vec![api_key_data.role],
            };
            req.extensions_mut().insert(auth_ctx);

            // Enforce admin scope for sensitive methods
            let path = req.uri().path();
            let is_admin_endpoint = path.contains("/gdpr/")
                || path.contains("/raw-sql")
                || path.contains("/users/")
                || path.contains("/deactivate");
            if is_admin_endpoint && !api_key_data.scopes.iter().any(|s| s == "admin") {
                return Err(ApiResponseError::Forbidden(
                    "API key lacks admin scope for this endpoint".to_string(),
                ));
            }

            return Ok(next.run(req).await);
        }
    }

    Err(ApiResponseError::unauthorized(
        "Missing or invalid Authorization header or API Key",
    ))
}
