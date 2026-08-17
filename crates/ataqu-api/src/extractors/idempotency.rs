use crate::{AppState, error::ApiResponseError, middleware::idempotency::IDEMPOTENCY_CACHE};
use ataqu_infra_idempotency::{
    AcquireOutcome, CachedResponse, IdempotencyGuard, SeaOrmIdempotencyStore,
};
use axum::Json;
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use sea_orm::DatabaseTransaction;
use serde::Serialize;
use std::future::Future;
use uuid::Uuid;

/// Acquire idempotency lock and return (command_id, optional guard, optional cached response)
pub async fn acquire_idempotency(
    app_state: &AppState,
    headers: &HeaderMap,
    tenant_id: Uuid,
) -> Result<(Uuid, Option<IdempotencyGuard>, Option<CachedResponse>), ApiResponseError> {
    let key = headers
        .get("Idempotency-Key")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| ApiResponseError::validation("Idempotency-Key header required"))?;

    let namespace = Uuid::NAMESPACE_DNS;
    let command_id = Uuid::new_v5(&namespace, format!("{}/{}", tenant_id, key).as_bytes());

    // Check Moka cache first (hot path)
    if let Some(cached) = IDEMPOTENCY_CACHE.get(&command_id.to_string()) {
        return Ok((command_id, None, Some(cached)));
    }

    // Acquire guard (advisory lock + DB record)
    let store = SeaOrmIdempotencyStore::new();
    let outcome = IdempotencyGuard::acquire(&app_state.db, command_id, Some(Box::new(store)))
        .await
        .map_err(|e| {
            use ataqu_infra_idempotency::IdempotencyError;
            match e {
                IdempotencyError::LockTimeout => ApiResponseError::ServiceUnavailable(
                    "Idempotency lock timeout, please retry".to_string(),
                ),
                _ => ApiResponseError::internal(&format!("Idempotency error: {}", e)),
            }
        })?;

    match outcome {
        AcquireOutcome::Completed(cached) => {
            // Cache in Moka and return cached
            IDEMPOTENCY_CACHE.insert(command_id.to_string(), cached.clone());
            Ok((command_id, None, Some(cached)))
        }
        AcquireOutcome::Proceed(guard) => Ok((command_id, Some(guard), None)),
    }
}

/// Helper to run an operation inside an idempotency context.
pub async fn with_idempotency<T, F, Fut>(
    command_id: Uuid,
    mut guard: IdempotencyGuard,
    operation: F,
) -> Result<Response, ApiResponseError>
where
    F: FnOnce(&mut DatabaseTransaction) -> Fut,
    Fut: Future<Output = Result<T, ApiResponseError>>,
    T: Serialize,
{
    let result = operation(guard.transaction()).await;

    match result {
        Ok(value) => {
            let response = Json(value).into_response();
            // Extract status and body for caching
            let status = response.status();
            let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
                .await
                .map_err(|e| {
                    ApiResponseError::internal(&format!("Failed to read response body: {}", e))
                })?;
            let body_json: serde_json::Value =
                serde_json::from_slice(&body_bytes).map_err(|e| {
                    ApiResponseError::internal(&format!("Failed to parse response body: {}", e))
                })?;
            let headers = std::collections::HashMap::new(); // We can extract headers if needed
            let cached = CachedResponse {
                status: status.as_u16(),
                headers,
                body: body_json,
            };
            // Complete guard and cache
            guard.complete(cached.clone(), None).await.map_err(|e| {
                ApiResponseError::internal(&format!("Idempotency completion failed: {}", e))
            })?;
            // Also cache in Moka
            IDEMPOTENCY_CACHE.insert(command_id.to_string(), cached);
            // Rebuild response
            let resp = axum::response::Response::builder()
                .status(status)
                .body(axum::body::Body::from(body_bytes))
                .map_err(|_| ApiResponseError::internal("failed to build idempotent response"))?;
            Ok(resp)
        }
        Err(e) if e.is_validation() => {
            // Mark as failed and return error
            guard.fail().await.map_err(|e| {
                ApiResponseError::internal(&format!("Idempotency failure update failed: {}", e))
            })?;
            Err(e)
        }
        Err(e) => {
            // Abort transaction (rollback)
            guard.abort().await.map_err(|e| {
                ApiResponseError::internal(&format!("Idempotency abort failed: {}", e))
            })?;
            Err(e)
        }
    }
}
