#[derive(Clone, Default)]
pub struct HealthService;

impl HealthService {
    pub fn new() -> Self {
        Self
    }

    pub async fn get_health_status(&self) -> serde_json::Value {
        tracing::warn!("HealthService is a placeholder; returning default health");
        serde_json::json!({
            "status": "nominal",
            "components": {}
        })
    }
}
