use crate::aggregation::AggregatedView;
use crate::analytics::AnalyticsDataPoint;
use async_trait::async_trait;
use ataqu_kernel::TenantId;

#[async_trait]
pub trait VistaRepository: Send + Sync {
    async fn get_aggregated_view(&self, tenant_id: &TenantId) -> Result<AggregatedView, String>;
    async fn save_aggregated_view(&self, view: &AggregatedView) -> Result<(), String>;
    async fn save_data_point(&self, point: &AnalyticsDataPoint) -> Result<(), String>;
    async fn get_data_points(
        &self,
        tenant_id: &TenantId,
        metric: &str,
        limit: u64,
    ) -> Result<Vec<AnalyticsDataPoint>, String>;

    async fn save_dashboard(&self, dashboard: &crate::Dashboard) -> Result<(), String>;
    async fn list_dashboards(&self, tenant_id: &TenantId) -> Result<Vec<crate::Dashboard>, String>;
    async fn get_dashboard_by_id(
        &self,
        tenant_id: &TenantId,
        id: uuid::Uuid,
    ) -> Result<Option<crate::Dashboard>, String>;
    async fn delete_dashboard(&self, tenant_id: &TenantId, id: uuid::Uuid) -> Result<(), String>;

    async fn get_raw_data_points(
        &self,
        tenant_id: &TenantId,
        metric: &str,
        dimension: &str,
        value: &str,
        limit: u64,
    ) -> Result<Vec<serde_json::Value>, String>;

    async fn get_cross_app_view(
        &self,
        tenant_id: &TenantId,
        view_name: &str,
    ) -> Result<Vec<serde_json::Value>, String>;

    async fn refresh_materialized_views(&self) -> Result<(), String>;
}
