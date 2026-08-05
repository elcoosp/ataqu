use async_trait::async_trait;
use ataqu_domain_vista::aggregation::AggregatedView;
use ataqu_domain_vista::analytics::AnalyticsDataPoint;
use ataqu_domain_vista::repository::VistaRepository;
use ataqu_kernel::TenantId;
use chrono::Utc;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, FromQueryResult, QueryFilter, QuerySelect,
    Statement,
};

// We define a local entity for the aggregated_views table
mod dashboard_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use serde_json::Value;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "dashboards", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub name: String,
        pub config: Value,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod aggregated_view_entity {
    use chrono::{DateTime, Utc};
    use rust_decimal::Decimal;
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "aggregated_views", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub tenant_id: Uuid,
        pub total_events: i64,
        pub total_contacts: i64,
        pub total_deals: i64,
        pub total_deals_won: i64,
        pub total_pipeline_value: Decimal,
        pub total_revenue: Decimal,
        pub total_products: i64,
        pub low_stock_variants: i64,
        pub total_bookings: i64,
        pub pending_leave_requests: i64,
        pub last_updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

// Local entity for analytics_data_points
mod data_point_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
    #[sea_orm(table_name = "analytics_data_points", schema_name = "core")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub metric_name: String,
        pub value: f64,
        pub timestamp: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
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
        let model = aggregated_view_entity::Entity::find_by_id(tenant_id.as_uuid())
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(model
            .map(|m| AggregatedView {
                tenant_id: TenantId::new(m.tenant_id),
                total_events: m.total_events as u64,
                total_contacts: m.total_contacts as u64,
                total_deals: m.total_deals as u64,
                total_deals_won: m.total_deals_won as u64,
                total_pipeline_value: m.total_pipeline_value,
                total_revenue: m.total_revenue,
                total_products: m.total_products as u64,
                low_stock_variants: m.low_stock_variants as u64,
                total_bookings: m.total_bookings as u64,
                pending_leave_requests: m.pending_leave_requests as u64,
                last_updated_at: m.last_updated_at.into(),
            })
            .unwrap_or_else(|| AggregatedView::new(*tenant_id)))
    }

    async fn save_aggregated_view(&self, view: &AggregatedView) -> Result<(), String> {
        let active = aggregated_view_entity::ActiveModel {
            tenant_id: sea_orm::Set(view.tenant_id.as_uuid()),
            total_events: sea_orm::Set(view.total_events as i64),
            total_contacts: sea_orm::Set(view.total_contacts as i64),
            total_deals: sea_orm::Set(view.total_deals as i64),
            total_deals_won: sea_orm::Set(view.total_deals_won as i64),
            total_pipeline_value: sea_orm::Set(view.total_pipeline_value),
            total_revenue: sea_orm::Set(view.total_revenue),
            total_products: sea_orm::Set(view.total_products as i64),
            low_stock_variants: sea_orm::Set(view.low_stock_variants as i64),
            total_bookings: sea_orm::Set(view.total_bookings as i64),
            pending_leave_requests: sea_orm::Set(view.pending_leave_requests as i64),
            last_updated_at: sea_orm::Set(Utc::now()),
        };

        let exists = aggregated_view_entity::Entity::find_by_id(view.tenant_id.as_uuid())
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .is_some();

        if exists {
            aggregated_view_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        } else {
            aggregated_view_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    async fn save_data_point(&self, point: &AnalyticsDataPoint) -> Result<(), String> {
        let active = data_point_entity::ActiveModel {
            id: sea_orm::Set(uuid::Uuid::new_v4()),
            tenant_id: sea_orm::Set(point.tenant_id.as_uuid()),
            metric_name: sea_orm::Set(point.metric_name.clone()),
            value: sea_orm::Set(point.value),
            timestamp: sea_orm::Set(point.timestamp.into()),
        };
        data_point_entity::Entity::insert(active)
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
        let models = data_point_entity::Entity::find()
            .filter(data_point_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(data_point_entity::Column::MetricName.eq(metric))
            .limit(limit)
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(models
            .into_iter()
            .map(|m| AnalyticsDataPoint {
                tenant_id: TenantId::new(m.tenant_id),
                timestamp: m.timestamp.into(),
                metric_name: m.metric_name,
                value: m.value,
            })
            .collect())
    }

    async fn save_dashboard(
        &self,
        dashboard: &ataqu_domain_vista::dashboard::Dashboard,
    ) -> Result<(), String> {
        let active = dashboard_entity::ActiveModel {
            id: sea_orm::Set(dashboard.id),
            tenant_id: sea_orm::Set(dashboard.tenant_id.as_uuid()),
            name: sea_orm::Set(dashboard.name.clone()),
            config: sea_orm::Set(dashboard.config.clone()),
            created_at: sea_orm::Set(dashboard.created_at),
            updated_at: sea_orm::Set(dashboard.updated_at),
        };
        let exists = dashboard_entity::Entity::find_by_id(dashboard.id)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .is_some();
        if exists {
            dashboard_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        } else {
            dashboard_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    async fn list_dashboards(
        &self,
        tenant_id: &TenantId,
    ) -> Result<Vec<ataqu_domain_vista::dashboard::Dashboard>, String> {
        let models = dashboard_entity::Entity::find()
            .filter(dashboard_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(models
            .into_iter()
            .map(|m| ataqu_domain_vista::dashboard::Dashboard {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                name: m.name,
                config: m.config,
                created_at: m.created_at,
                updated_at: m.updated_at,
            })
            .collect())
    }

    async fn delete_dashboard(&self, tenant_id: &TenantId, id: uuid::Uuid) -> Result<(), String> {
        dashboard_entity::Entity::delete_many()
            .filter(dashboard_entity::Column::Id.eq(id))
            .filter(dashboard_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn execute_raw_sql(
        &self,
        tenant_id: &TenantId,
        sql: &str,
    ) -> Result<Vec<serde_json::Value>, String> {
        #[derive(Debug, FromQueryResult)]
        struct GenericRow {
            data: serde_json::Value,
        }

        let wrapped_sql = format!("SELECT jsonb_agg(row_to_json(t)) as data FROM ({}) t", sql);
        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            wrapped_sql,
            vec![tenant_id.as_uuid().into()],
        );

        let result = GenericRow::find_by_statement(stmt)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;

        match result {
            Some(row) => Ok(row.data.as_array().cloned().unwrap_or_default()),
            None => Ok(Vec::new()),
        }
    }

    async fn get_dashboard_by_id(
        &self,
        _tenant_id: &TenantId,
        _id: uuid::Uuid,
    ) -> Result<Option<ataqu_domain_vista::Dashboard>, String> {
        // TODO: Implement actual DB query
        Ok(None)
    }

}
