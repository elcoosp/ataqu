//! Real SeaORM-based repositories for PAUSE domain.
use async_trait::async_trait;
use sea_orm::{DatabaseConnection, EntityTrait, Set};
use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate};

use ataqu_kernel::TenantId;
use ataqu_domain_pause::{EmployeeCreatedEvent, LeaveRequestedEvent, PauseDomainError};
use ataqu_domain_pause::repository::{EmployeeRepositoryPort, LeaveRequestRepositoryPort};

// Employee entity module
mod employee {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "employees", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub first_name: String,
        pub last_name: String,
        pub email: String,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

// Leave request entity module
mod leave_request {
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;
    use chrono::{NaiveDate, DateTime, Utc};

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "leave_requests", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub employee_id: Uuid,
        pub start_date: NaiveDate,
        pub end_date: NaiveDate,
        pub status: String,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

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
    ) -> Result<(), PauseDomainError> {
        use employee::Entity as EmployeeEntity;
        let active = employee::ActiveModel {
            id: Set(event.employee_id),
            tenant_id: Set(tenant_id.as_uuid()),
            first_name: Set(event.first_name.clone()),
            last_name: Set(event.last_name.clone()),
            email: Set(event.email.clone()),
            created_at: Set(Utc::now()),
        };
        EmployeeEntity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(())
    }
}

#[async_trait]
impl LeaveRequestRepositoryPort for PauseRepositoryImpl {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &LeaveRequestedEvent,
    ) -> Result<(), PauseDomainError> {
        use leave_request::Entity as LeaveRequestEntity;
        let start_date = DateTime::<Utc>::from(event.start_date).date_naive();
        let end_date = DateTime::<Utc>::from(event.end_date).date_naive();
        let active = leave_request::ActiveModel {
            id: Set(event.leave_request_id),
            tenant_id: Set(tenant_id.as_uuid()),
            employee_id: Set(event.employee_id),
            start_date: Set(start_date),
            end_date: Set(end_date),
            status: Set("pending".to_string()),
            created_at: Set(Utc::now()),
        };
        LeaveRequestEntity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(())
    }
}
