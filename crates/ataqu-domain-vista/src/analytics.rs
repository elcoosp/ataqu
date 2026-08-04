use ataqu_kernel::{Clock, TenantId};
use std::time::SystemTime;

/// Represents a time-series analytics data point.
#[derive(Debug, Clone, PartialEq)]
pub struct AnalyticsDataPoint {
    pub tenant_id: TenantId,
    pub timestamp: SystemTime,
    pub metric_name: String,
    pub value: f64,
}

/// Pure function to validate and prepare an analytics data point for ingestion.
pub fn prepare_data_point(
    tenant_id: TenantId,
    metric_name: String,
    value: f64,
    clock: &dyn Clock,
) -> Result<AnalyticsDataPoint, AnalyticsError> {
    if metric_name.trim().is_empty() {
        return Err(AnalyticsError::InvalidMetricName);
    }
    if value.is_nan() || value.is_infinite() {
        return Err(AnalyticsError::InvalidValue);
    }

    Ok(AnalyticsDataPoint {
        tenant_id,
        timestamp: clock.now(),
        metric_name,
        value,
    })
}

#[derive(Debug, thiserror::Error)]
pub enum AnalyticsError {
    #[error("Metric name cannot be empty")]
    InvalidMetricName,
    #[error("Metric value must be a finite number")]
    InvalidValue,
}
