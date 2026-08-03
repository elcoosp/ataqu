//! PAUSE repository implementations using SeaORM.
use async_trait::async_trait;
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveValue};
use uuid::Uuid;
use ataqu_kernel::TenantId;
use ataqu_application::pause_service::{
    EmployeeRepositoryPort, LeaveRequestRepositoryPort,
    PauseServiceError, EmployeeCreatedEvent, LeaveRequestedEvent,
};

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "employees", schema_name = "collab_ops")]
pub struct EmployeeModel {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum EmployeeRelation {}

impl ActiveModelBehavior for EmployeeActiveModel {}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "leave_requests", schema_name = "collab_ops")]
pub struct LeaveRequestModel {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub employee_id: Uuid,
    pub start_date: chrono::NaiveDate,
    pub end_date: chrono::NaiveDate,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum LeaveRequestRelation {}

impl ActiveModelBehavior for LeaveRequestActiveModel {}

pub struct PauseRepositoryImpl {
    db: DatabaseConnection,
}

impl PauseRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl EmployeeRepositoryPort for PauseRepositoryImpl {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &EmployeeCreatedEvent,
    ) -> Result<(), PauseServiceError> {
        let now = chrono::Utc::now();
        let active = EmployeeActiveModel {
            id: Set(event.employee_id),
            tenant_id: Set(tenant_id.as_uuid()),
            first_name: Set(event.first_name.clone()),
            last_name: Set(event.last_name.clone()),
            email: Set(event.email.clone()),
            created_at: Set(now),
        };
        EmployeeModel::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))?;
        Ok(())
    }
}

#[async_trait]
impl LeaveRequestRepositoryPort for PauseRepositoryImpl {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &LeaveRequestedEvent,
    ) -> Result<(), PauseServiceError> {
        let now = chrono::Utc::now();
        let start_date = chrono::DateTime::<chrono::Utc>::from(event.start_date).date_naive();
        let end_date = chrono::DateTime::<chrono::Utc>::from(event.end_date).date_naive();
        let active = LeaveRequestActiveModel {
            id: Set(event.leave_request_id),
            tenant_id: Set(tenant_id.as_uuid()),
            employee_id: Set(event.employee_id),
            start_date: Set(start_date),
            end_date: Set(end_date),
            status: Set("pending".to_string()),
            created_at: Set(now),
        };
        LeaveRequestModel::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| PauseServiceError::Persistence(e.to_string()))?;
        Ok(())
    }
}
