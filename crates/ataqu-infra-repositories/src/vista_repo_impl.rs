//! SeaORM implementations for VISTA domain repository.
use async_trait::async_trait;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, IntoActiveModel, QuerySelect, ActiveModelTrait, QueryOrder};
use uuid::Uuid;

use ataqu_kernel::TenantId;
use ataqu_domain_vista::aggregation::AggregatedView;
use ataqu_domain_vista::analytics::AnalyticsDataPoint;
use ataqu_domain_vista::repository::VistaRepository;

use crate::entities::vista::aggregated_view as view_entity;
use crate::entities::vista::data_point as point_entity;

fn view_to_model(view: &AggregatedView) -> view_entity::ActiveModel {
    view_entity::ActiveModel {
        tenant_id: Set(view.tenant_id.as_uuid()),
        total_events: Set(view.total_events as i64),
        last_updated_at: Set(view.last_updated_at.into()),
    }
}

fn model_to_view(model: view_entity::Model) -> AggregatedView {
    AggregatedView {
        tenant_id: TenantId::new(model.tenant_id),
        total_events: model.total_events as u64,
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
        // Upsert
        let existing = view_entity::Entity::find()
            .filter(view_entity::Column::TenantId.eq(view.tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        if let Some(model) = existing {
            let mut active_model = model.into_active_model();
            active_model.total_events = active.total_events;
            active_model.last_updated_at = active.last_updated_at;
            active_model.update(&self.db).await.map_err(|e| e.to_string())?;
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

    async fn get_data_points(&self, tenant_id: &TenantId, metric: &str, limit: u64) -> Result<Vec<AnalyticsDataPoint>, String> {
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
