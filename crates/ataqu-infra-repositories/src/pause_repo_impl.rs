//! Real SeaORM-based repositories for PAUSE domain.
use async_trait::async_trait;
use chrono::Utc;
use sea_orm::PaginatorTrait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, IntoActiveModel,
    QueryFilter, QueryOrder, QuerySelect, Set,
};
use std::time::SystemTime;
use uuid::Uuid;

use ataqu_domain_pause::employee::Employee;
use ataqu_domain_pause::repository::{EmployeeRepositoryPort, LeaveRequestRepositoryPort};
use ataqu_domain_pause::{
    EmployeeCreatedEvent, LeaveRequest, LeaveRequestedEvent, LeaveStatus, PauseDomainError,
};
use ataqu_kernel::TenantId;

mod employee {
    use chrono::{DateTime, NaiveDate, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "employees", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub full_name: String,
        pub email: String,
        pub phone: Option<String>,
        pub job_title: String,
        pub department: Option<String>,
        pub hire_date: Option<NaiveDate>,
        pub is_active: bool,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod leave_request {
    use chrono::{DateTime, NaiveDate, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "leave_requests", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub employee_id: Uuid,
        pub leave_type: String,
        pub start_date: NaiveDate,
        pub end_date: NaiveDate,
        pub reason: Option<String>,
        pub status: String,
        pub reviewer_id: Option<Uuid>,
        pub reviewed_at: Option<DateTime<Utc>>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
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

    // Helper to map employee model to domain Employee
    fn model_to_employee(m: employee::Model) -> Employee {
        Employee {
            id: m.id,
            tenant_id: TenantId::new(m.tenant_id),
            full_name: m.full_name,
            email: ataqu_security::Email::new(m.email),
            phone: m.phone.map(ataqu_security::PhoneNumber::new),
            job_title: m.job_title,
            department: m.department,
            hire_date: m
                .hire_date
                .unwrap_or_else(|| chrono::Utc::now().date_naive()),
            is_active: m.is_active,
            created_at: m.created_at.into(),
            updated_at: m.updated_at.into(),
        }
    }

    // Helper to map leave model to domain LeaveRequest
    fn model_to_leave(m: leave_request::Model) -> LeaveRequest {
        let status = match m.status.as_str() {
            "approved" => LeaveStatus::Approved,
            "rejected" => LeaveStatus::Rejected,
            "cancelled" => LeaveStatus::Cancelled,
            _ => LeaveStatus::Pending,
        };
        let leave_type = match m.leave_type.as_str() {
            "annual" => ataqu_domain_pause::leave::LeaveType::Annual,
            "sick" => ataqu_domain_pause::leave::LeaveType::Sick,
            "personal" => ataqu_domain_pause::leave::LeaveType::Personal,
            "unpaid" => ataqu_domain_pause::leave::LeaveType::Unpaid,
            _ => ataqu_domain_pause::leave::LeaveType::Annual,
        };
        LeaveRequest {
            id: m.id,
            tenant_id: TenantId::new(m.tenant_id),
            employee_id: m.employee_id,
            leave_type,
            start_date: m.start_date,
            end_date: m.end_date,
            reason: m.reason,
            status,
            reviewer_id: m.reviewer_id,
            reviewed_at: m.reviewed_at.map(|dt| dt.into()),
            created_at: m.created_at.into(),
            updated_at: m.updated_at.into(),
        }
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
            full_name: Set(event.full_name.clone()),
            email: Set(event.email.reveal(&ataqu_security::PiiAccessKey::new_for_test()).to_string()),
            phone: Set(event.phone.clone().map(|p| p.reveal(&ataqu_security::PiiAccessKey::new_for_test()).to_string())),
            job_title: Set(event.job_title.clone()),
            department: Set(event.department.clone()),
            hire_date: Set(Some(event.hire_date)),
            is_active: Set(true),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };
        EmployeeEntity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(())
    }

    async fn find_by_id(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<Option<Employee>, PauseDomainError> {
        use employee::Entity as EmployeeEntity;
        let model = EmployeeEntity::find()
            .filter(employee::Column::Id.eq(employee_id))
            .filter(employee::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(model.map(Self::model_to_employee))
    }

    async fn list(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Employee>, PauseDomainError> {
        use employee::Entity as EmployeeEntity;
        let models = EmployeeEntity::find()
            .filter(employee::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .order_by_asc(employee::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(models.into_iter().map(Self::model_to_employee).collect())
    }

    async fn search(
        &self,
        tenant_id: &TenantId,
        query: &str,
        limit: u64,
    ) -> Result<Vec<Employee>, PauseDomainError> {
        use employee::Entity as EmployeeEntity;
        let pattern = format!("%{}%", query);
        let condition = Condition::any()
            .add(employee::Column::FullName.ilike(&pattern))
            .add(employee::Column::Email.ilike(&pattern))
            .add(employee::Column::JobTitle.ilike(&pattern));
        let models = EmployeeEntity::find()
            .filter(employee::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(condition)
            .limit(limit)
            .all(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(models.into_iter().map(Self::model_to_employee).collect())
    }

    async fn deactivate(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<(), PauseDomainError> {
        use employee::Entity as EmployeeEntity;
        let mut active = EmployeeEntity::find()
            .filter(employee::Column::Id.eq(employee_id))
            .filter(employee::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?
            .ok_or(PauseDomainError::NotFound)?
            .into_active_model();
        active.is_active = Set(false);
        active.updated_at = Set(Utc::now());
        active
            .update(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(())
    }

    async fn count(&self, tenant_id: &TenantId) -> Result<u64, PauseDomainError> {
        use employee::Entity as EmployeeEntity;
        let count = EmployeeEntity::find()
            .filter(employee::Column::TenantId.eq(tenant_id.as_uuid()))
            .count(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(count)
    }
}

#[async_trait]
impl LeaveRequestRepositoryPort for PauseRepositoryImpl {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &LeaveRequestedEvent,
    ) -> Result<(), PauseDomainError> {
        use leave_request::Entity as LeaveEntity;
        let active = leave_request::ActiveModel {
            id: Set(event.leave_request_id),
            tenant_id: Set(tenant_id.as_uuid()),
            employee_id: Set(event.employee_id),
            leave_type: Set(format!("{:?}", event.leave_type).to_lowercase()),
            start_date: Set(event.start_date),
            end_date: Set(event.end_date),
            reason: Set(event.reason.clone()),
            status: Set("pending".to_string()),
            reviewer_id: Set(None),
            reviewed_at: Set(None),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };
        LeaveEntity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(())
    }

    async fn find_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> Result<Option<LeaveRequest>, PauseDomainError> {
        use leave_request::Entity as LeaveEntity;
        let model = LeaveEntity::find()
            .filter(leave_request::Column::Id.eq(id))
            .filter(leave_request::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(model.map(Self::model_to_leave))
    }

    async fn list(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<LeaveRequest>, PauseDomainError> {
        use leave_request::Entity as LeaveEntity;
        let models = LeaveEntity::find()
            .filter(leave_request::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .order_by_desc(leave_request::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(models.into_iter().map(Self::model_to_leave).collect())
    }

    async fn list_for_employee(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<Vec<LeaveRequest>, PauseDomainError> {
        use leave_request::Entity as LeaveEntity;
        let models = LeaveEntity::find()
            .filter(leave_request::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(leave_request::Column::EmployeeId.eq(employee_id))
            .order_by_desc(leave_request::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(models.into_iter().map(Self::model_to_leave).collect())
    }

    async fn list_pending(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<LeaveRequest>, PauseDomainError> {
        use leave_request::Entity as LeaveEntity;
        let models = LeaveEntity::find()
            .filter(leave_request::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(leave_request::Column::Status.eq("pending"))
            .limit(limit)
            .offset(offset)
            .order_by_asc(leave_request::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(models.into_iter().map(Self::model_to_leave).collect())
    }

    async fn update_status(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
        status: LeaveStatus,
        reviewer_id: Uuid,
        updated_at: SystemTime,
    ) -> Result<(), PauseDomainError> {
        use leave_request::Entity as LeaveEntity;
        let mut active = LeaveEntity::find()
            .filter(leave_request::Column::Id.eq(id))
            .filter(leave_request::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?
            .ok_or(PauseDomainError::NotFound)?
            .into_active_model();
        let status_str = match status {
            LeaveStatus::Approved => "approved",
            LeaveStatus::Rejected => "rejected",
            LeaveStatus::Cancelled => "cancelled",
            _ => "pending",
        };
        active.status = Set(status_str.to_string());
        active.reviewer_id = Set(Some(reviewer_id));
        active.reviewed_at = Set(Some(updated_at.into()));
        active.updated_at = Set(updated_at.into());
        active
            .update(&self.db)
            .await
            .map_err(|e| PauseDomainError::Persistence(e.to_string()))?;
        Ok(())
    }
}


mod employee_document_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "employee_documents", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub employee_id: Uuid,
        pub file_name: String,
        pub file_url: String,
        pub doc_type: String,
        pub created_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

#[async_trait::async_trait]
impl ataqu_domain_pause::repository::EmployeeDocumentRepository for PauseRepositoryImpl {
    async fn save_document(&self, doc: &ataqu_domain_pause::EmployeeDocument) -> Result<(), ataqu_domain_pause::PauseDomainError> {
        let active = employee_document_entity::ActiveModel {
            id: sea_orm::Set(doc.id),
            tenant_id: sea_orm::Set(doc.tenant_id.as_uuid()),
            employee_id: sea_orm::Set(doc.employee_id),
            file_name: sea_orm::Set(doc.file_name.clone()),
            file_url: sea_orm::Set(doc.file_url.clone()),
            doc_type: sea_orm::Set(doc.doc_type.clone()),
            created_at: sea_orm::Set(doc.created_at),
        };
        employee_document_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| ataqu_domain_pause::PauseDomainError::Persistence(e.to_string()))?;
        Ok(())
    }

    async fn list_documents_for_employee(
        &self,
        tenant_id: &ataqu_kernel::TenantId,
        employee_id: uuid::Uuid,
    ) -> Result<Vec<ataqu_domain_pause::EmployeeDocument>, ataqu_domain_pause::PauseDomainError> {
        let models = employee_document_entity::Entity::find()
            .filter(employee_document_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(employee_document_entity::Column::EmployeeId.eq(employee_id))
            .all(&self.db)
            .await
            .map_err(|e| ataqu_domain_pause::PauseDomainError::Persistence(e.to_string()))?;

        Ok(models.into_iter().map(|m| ataqu_domain_pause::EmployeeDocument {
            id: m.id,
            tenant_id: ataqu_kernel::TenantId::new(m.tenant_id),
            employee_id: m.employee_id,
            file_name: m.file_name,
            file_url: m.file_url,
            doc_type: m.doc_type,
            created_at: m.created_at,
        }).collect())
    }
}
