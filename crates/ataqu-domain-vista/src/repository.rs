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

    async fn save_dashboard(&self, dashboard: &crate::dashboard::Dashboard) -> Result<(), String>;
    async fn list_dashboards(
        &self,
        tenant_id: &TenantId,
    ) -> Result<Vec<crate::dashboard::Dashboard>, String>;
    async fn delete_dashboard(&self, tenant_id: &TenantId, id: uuid::Uuid) -> Result<(), String>;

    async fn execute_raw_sql(
        &self,
        tenant_id: &TenantId,
        sql: &str,
    ) -> Result<Vec<serde_json::Value>, String>;
}
