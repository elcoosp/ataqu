use crate::AppState;
use ataqu_application::health_service::{ComponentHealth, Components, HealthStatus, SystemHealth};
use axum::{Json, extract::State, response::IntoResponse};

const HEALTH_CACHE_KEY: &str = "system_health";

/// GET /api/v1/health/status
///
/// Aggregated system health (ADR-034). Results are cached for 5 seconds
/// (Moka, TTL configured in `main.rs`) to avoid hammering the database.
pub async fn get_health_status(State(state): State<AppState>) -> impl IntoResponse {
    let cache = state.health_cache.clone();
    let service = state.health_service.clone();

    if let Some(cached) = cache.get(&HEALTH_CACHE_KEY.to_string()) {
        return Json(cached.clone());
    }

    match service.get_system_health().await {
        Ok(health) => {
            let value = serde_json::to_value(&health).unwrap_or(serde_json::Value::Null);
            cache.insert(HEALTH_CACHE_KEY.to_string(), value.clone());
            Json(value)
        }
        Err(error) => {
            tracing::error!(error = %error, "Failed to collect system health");
            let fallback = SystemHealth {
                status: HealthStatus::Critical,
                timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                components: Components {
                    outbox: ComponentHealth {
                        status: HealthStatus::Critical,
                        lag_seconds: 0.0,
                        pending_events: 0,
                        last_dispatched_at: None,
                    },
                },
            };
            Json(serde_json::to_value(&fallback).unwrap_or(serde_json::Value::Null))
        }
    }
}
