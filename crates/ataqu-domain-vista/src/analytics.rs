use ataqu_kernel::TenantId;
use std::time::SystemTime;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AnalyticsDataPoint {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub metric_name: String,
    pub value: f64,
    pub timestamp: SystemTime,
}

pub fn prepare_data_point(
    tenant_id: TenantId,
    metric_name: String,
    value: f64,
    clock: &dyn ataqu_kernel::Clock,
) -> Result<AnalyticsDataPoint, String> {
    Ok(AnalyticsDataPoint {
        id: Uuid::new_v4(),
        tenant_id,
        metric_name,
        value,
        timestamp: clock.now(),
    })
}
