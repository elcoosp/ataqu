//! SeaORM implementations for VISTA domain repository.
use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use uuid::Uuid;

use ataqu_domain_vista::aggregation::AggregatedView;
use ataqu_domain_vista::analytics::AnalyticsDataPoint;
use ataqu_domain_vista::repository::VistaRepository;
use ataqu_kernel::TenantId;

use crate::entities::vista::aggregated_view as view_entity;
use crate::entities::vista::data_point as point_entity;

fn view_to_model(view: &AggregatedView) -> view_entity::ActiveModel {
    view_entity::ActiveModel {
        tenant_id: Set(view.tenant_id.as_uuid()),
        total_events: Set(view.total_events as i64),
        total_contacts: Set(view.total_contacts as i64),
        total_deals: Set(view.total_deals as i64),
        total_deals_won: Set(view.total_deals_won as i64),
        total_pipeline_value: Set(view.total_pipeline_value),
        total_revenue: Set(view.total_revenue),
        total_products: Set(view.total_products as i64),
        low_stock_variants: Set(view.low_stock_variants as i64),
        total_bookings: Set(view.total_bookings as i64),
        pending_leave_requests: Set(view.pending_leave_requests as i64),
        last_updated_at: Set(view.last_updated_at.into()),
    }
}

fn model_to_view(model: view_entity::Model) -> AggregatedView {
    AggregatedView {
        tenant_id: TenantId::new(model.tenant_id),
        total_events: model.total_events as u64,
        total_contacts: model.total_contacts as u64,
        total_deals: model.total_deals as u64,
        total_deals_won: model.total_deals_won as u64,
        total_pipeline_value: model.total_pipeline_value,
        total_revenue: model.total_revenue,
        total_products: model.total_products as u64,
        low_stock_variants: model.low_stock_variants as u64,
        total_bookings: model.total_bookings as u64,
        pending_leave_requests: model.pending_leave_requests as u64,
        last_updated_at: model.last_updated_at.into(),
    }
}

fn point_to_model(point: &AnalyticsDataPoint) -> point_entity::ActiveModel {
    point_entity::ActiveModel {
        id: Set(Uuid::new_v4()),
        tenant_id: Set(point.tenant_id.as_uuid()),
        metric_name: Set(point.metric_name.clone()),
        value: Set(point.value),
        timestamp: Set(point.timestamp.into()),
    }
}

fn model_to_point(model: point_entity::Model) -> AnalyticsDataPoint {
    AnalyticsDataPoint {
        tenant_id: TenantId::new(model.tenant_id),
        timestamp: model.timestamp.into(),
        metric_name: model.metric_name,
        value: model.value,
    }
}

pub struct VistaRepositoryImpl {
    db: DatabaseConnection,
}

impl VistaRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl VistaRepository for VistaRepositoryImpl {
    async fn get_aggregated_view(&self, tenant_id: &TenantId) -> Result<AggregatedView, String> {
        let model = view_entity::Entity::find()
            .filter(view_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "View not found".to_string())?;
        Ok(model_to_view(model))
    }

    async fn save_aggregated_view(&self, view: &AggregatedView) -> Result<(), String> {
        let active = view_to_model(view);
        let existing = view_entity::Entity::find()
            .filter(view_entity::Column::TenantId.eq(view.tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        if let Some(model) = existing {
            let mut active_model = model.into_active_model();
            active_model.total_events = active.total_events;
            active_model.total_contacts = active.total_contacts;
            active_model.total_deals = active.total_deals;
            active_model.total_deals_won = active.total_deals_won;
            active_model.total_pipeline_value = active.total_pipeline_value;
            active_model.total_revenue = active.total_revenue;
            active_model.total_products = active.total_products;
            active_model.low_stock_variants = active.low_stock_variants;
            active_model.total_bookings = active.total_bookings;
            active_model.pending_leave_requests = active.pending_leave_requests;
            active_model.last_updated_at = active.last_updated_at;
            active_model
                .update(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        } else {
            view_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    async fn save_data_point(&self, point: &AnalyticsDataPoint) -> Result<(), String> {
        let active = point_to_model(point);
        point_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn get_data_points(
        &self,
        tenant_id: &TenantId,
        metric: &str,
        limit: u64,
    ) -> Result<Vec<AnalyticsDataPoint>, String> {
        let models = point_entity::Entity::find()
            .filter(point_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(point_entity::Column::MetricName.eq(metric))
            .limit(limit)
            .order_by_desc(point_entity::Column::Timestamp)
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models.into_iter().map(model_to_point).collect())
    }
}
