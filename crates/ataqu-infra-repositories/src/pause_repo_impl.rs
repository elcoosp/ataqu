#![allow(clippy::useless_conversion)]
use async_trait::async_trait;
use ataqu_domain_pause::employee::Employee;
use ataqu_domain_pause::leave::{LeaveRequest, LeaveStatus, LeaveType};
use ataqu_domain_pause::repository::{
    EmployeeDocumentRepository, EmployeeRepositoryPort, LeaveRequestRepositoryPort,
};
use ataqu_domain_pause::{EmployeeDocument, PauseDomainError};
use ataqu_kernel::TenantId;
use ataqu_security::Email;
use sea_orm::entity::prelude::*;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter, QuerySelect, Set,
};
use std::time::SystemTime;
use uuid::Uuid;

mod employee_entity {
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
        pub hire_date: NaiveDate,
        pub is_active: bool,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
        pub version: i32,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod leave_request_entity {
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
        pub version: i32,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
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

pub struct PauseRepositoryImpl {
    db: DatabaseConnection,
}

#[allow(clippy::useless_conversion)]
impl PauseRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn map_err(e: sea_orm::DbErr) -> PauseDomainError {
    PauseDomainError::Persistence(e.to_string())
}

fn leave_type_from_str(s: &str) -> LeaveType {
    match s {
        "annual" => LeaveType::Annual,
        "sick" => LeaveType::Sick,
        "personal" => LeaveType::Personal,
        "unpaid" => LeaveType::Unpaid,
        _ => LeaveType::Annual,
    }
}

fn leave_status_from_str(s: &str) -> LeaveStatus {
    match s {
        "pending" => LeaveStatus::Pending,
        "approved" => LeaveStatus::Approved,
        "rejected" => LeaveStatus::Rejected,
        "cancelled" => LeaveStatus::Cancelled,
        _ => LeaveStatus::Pending,
    }
}

#[async_trait]
impl EmployeeRepositoryPort for PauseRepositoryImpl {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &ataqu_domain_pause::EmployeeCreatedEvent,
    ) -> Result<(), PauseDomainError> {
        let active = employee_entity::ActiveModel {
            id: Set(event.employee_id),
            tenant_id: Set(tenant_id.as_uuid()),
            full_name: Set(event.full_name.clone()),
            email: Set(event
                .email
                .reveal(&ataqu_security::PiiAccessKey::new_for_test())
                .to_string()),
            phone: Set(event.phone.clone()),
            job_title: Set(event.job_title.clone()),
            department: Set(event.department.clone()),
            hire_date: Set(event.hire_date),
            is_active: Set(true),
            created_at: Set(event.created_at.into()),
            updated_at: Set(event.created_at.into()),
            version: Set(0),
        };
        employee_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(map_err)?;
        Ok(())
    }

    async fn find_by_id(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<Option<Employee>, PauseDomainError> {
        let model = employee_entity::Entity::find()
            .filter(employee_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(employee_entity::Column::Id.eq(employee_id))
            .one(&self.db)
            .await
            .map_err(map_err)?;

        Ok(model.map(|m| Employee {
            id: m.id,
            tenant_id: TenantId::new(m.tenant_id),
            full_name: m.full_name,
            email: Email::new(m.email),
            phone: m.phone,
            job_title: m.job_title,
            department: m.department,
            hire_date: m.hire_date,
            is_active: m.is_active,
            created_at: m.created_at.into(),
            updated_at: m.updated_at.into(),
            version: m.version,
        }))
    }

    async fn list(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Employee>, PauseDomainError> {
        let models = employee_entity::Entity::find()
            .filter(employee_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(map_err)?;

        Ok(models
            .into_iter()
            .map(|m| Employee {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                full_name: m.full_name,
                email: Email::new(m.email),
                phone: m.phone,
                job_title: m.job_title,
                department: m.department,
                hire_date: m.hire_date,
                is_active: m.is_active,
                created_at: m.created_at.into(),
                updated_at: m.updated_at.into(),
                version: m.version,
            })
            .collect())
    }

    async fn search(
        &self,
        tenant_id: &TenantId,
        query: &str,
        limit: u64,
    ) -> Result<Vec<Employee>, PauseDomainError> {
        let models = employee_entity::Entity::find()
            .filter(employee_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(employee_entity::Column::FullName.like(format!("%{}%", query)))
            .limit(limit)
            .all(&self.db)
            .await
            .map_err(map_err)?;

        Ok(models
            .into_iter()
            .map(|m| Employee {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                full_name: m.full_name,
                email: Email::new(m.email),
                phone: m.phone,
                job_title: m.job_title,
                department: m.department,
                hire_date: m.hire_date,
                is_active: m.is_active,
                created_at: m.created_at.into(),
                updated_at: m.updated_at.into(),
                version: m.version,
            })
            .collect())
    }

    async fn update(
        &self,
        tenant_id: &TenantId,
        employee: &Employee,
    ) -> Result<(), PauseDomainError> {
        let active = employee_entity::ActiveModel {
            id: Set(employee.id),
            tenant_id: Set(tenant_id.as_uuid()),
            full_name: Set(employee.full_name.clone()),
            email: Set(employee
                .email
                .reveal(&ataqu_security::PiiAccessKey::new_for_test())
                .to_string()),
            phone: Set(employee.phone.clone()),
            job_title: Set(employee.job_title.clone()),
            department: Set(employee.department.clone()),
            hire_date: Set(employee.hire_date),
            is_active: Set(employee.is_active),
            created_at: Set(employee.created_at.into()),
            updated_at: Set(employee.updated_at.into()),
            version: Set(employee.version),
        };
        employee_entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(map_err)?;
        Ok(())
    }

    async fn deactivate(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<(), PauseDomainError> {
        let mut active = employee_entity::Entity::find()
            .filter(employee_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(employee_entity::Column::Id.eq(employee_id))
            .one(&self.db)
            .await
            .map_err(map_err)?
            .ok_or(PauseDomainError::NotFound)?
            .into_active_model();

        active.is_active = Set(false);
        employee_entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(map_err)?;
        Ok(())
    }

    async fn count_employees(&self, tenant_id: &TenantId) -> Result<u64, PauseDomainError> {
        let count = employee_entity::Entity::find()
            .filter(employee_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .count(&self.db)
            .await
            .map_err(map_err)?;
        Ok(count)
    }
}

#[async_trait]
impl LeaveRequestRepositoryPort for PauseRepositoryImpl {
    async fn insert(
        &self,
        tenant_id: &TenantId,
        event: &ataqu_domain_pause::LeaveRequestedEvent,
    ) -> Result<(), PauseDomainError> {
        let active = leave_request_entity::ActiveModel {
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
            created_at: Set(event.created_at.into()),
            updated_at: Set(event.created_at.into()),
            version: Set(0),
        };
        leave_request_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(map_err)?;
        Ok(())
    }

    async fn find_by_id(
        &self,
        tenant_id: &TenantId,
        leave_id: Uuid,
    ) -> Result<Option<LeaveRequest>, PauseDomainError> {
        let model = leave_request_entity::Entity::find()
            .filter(leave_request_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(leave_request_entity::Column::Id.eq(leave_id))
            .one(&self.db)
            .await
            .map_err(map_err)?;

        Ok(model.map(|m| LeaveRequest {
            id: m.id,
            tenant_id: TenantId::new(m.tenant_id),
            employee_id: m.employee_id,
            leave_type: leave_type_from_str(&m.leave_type),
            start_date: m.start_date,
            end_date: m.end_date,
            reason: m.reason,
            status: leave_status_from_str(&m.status),
            reviewer_id: m.reviewer_id,
            reviewed_at: m.reviewed_at.map(|t| t.into()),
            created_at: m.created_at.into(),
            updated_at: m.updated_at.into(),
            version: m.version,
        }))
    }

    async fn list(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<LeaveRequest>, PauseDomainError> {
        let models = leave_request_entity::Entity::find()
            .filter(leave_request_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(map_err)?;

        Ok(models
            .into_iter()
            .map(|m| LeaveRequest {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                employee_id: m.employee_id,
                leave_type: leave_type_from_str(&m.leave_type),
                start_date: m.start_date,
                end_date: m.end_date,
                reason: m.reason,
                status: leave_status_from_str(&m.status),
                reviewer_id: m.reviewer_id,
                reviewed_at: m.reviewed_at.map(|t| t.into()),
                created_at: m.created_at.into(),
                updated_at: m.updated_at.into(),
                version: m.version,
            })
            .collect())
    }

    async fn update_status(
        &self,
        _tenant_id: &TenantId,
        leave_id: Uuid,
        status: LeaveStatus,
        reviewer_id: Uuid,
        now: SystemTime,
    ) -> Result<(), PauseDomainError> {
        let mut active = leave_request_entity::Entity::find_by_id(leave_id)
            .one(&self.db)
            .await
            .map_err(map_err)?
            .ok_or(PauseDomainError::NotFound)?
            .into_active_model();

        active.status = Set(format!("{:?}", status).to_lowercase());
        active.reviewer_id = Set(Some(reviewer_id));
        active.reviewed_at = Set(Some(now.into()));
        active.updated_at = Set(now.into());

        leave_request_entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(map_err)?;
        Ok(())
    }

    async fn list_for_employee(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
    ) -> Result<Vec<LeaveRequest>, PauseDomainError> {
        let models = leave_request_entity::Entity::find()
            .filter(leave_request_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(leave_request_entity::Column::EmployeeId.eq(employee_id))
            .all(&self.db)
            .await
            .map_err(map_err)?;

        Ok(models
            .into_iter()
            .map(|m| LeaveRequest {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                employee_id: m.employee_id,
                leave_type: leave_type_from_str(&m.leave_type),
                start_date: m.start_date,
                end_date: m.end_date,
                reason: m.reason,
                status: leave_status_from_str(&m.status),
                reviewer_id: m.reviewer_id,
                reviewed_at: m.reviewed_at.map(|t| t.into()),
                created_at: m.created_at.into(),
                updated_at: m.updated_at.into(),
                version: m.version,
            })
            .collect())
    }

    async fn list_pending(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<LeaveRequest>, PauseDomainError> {
        let models = leave_request_entity::Entity::find()
            .filter(leave_request_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(leave_request_entity::Column::Status.eq("pending"))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(map_err)?;

        Ok(models
            .into_iter()
            .map(|m| LeaveRequest {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                employee_id: m.employee_id,
                leave_type: leave_type_from_str(&m.leave_type),
                start_date: m.start_date,
                end_date: m.end_date,
                reason: m.reason,
                status: leave_status_from_str(&m.status),
                reviewer_id: m.reviewer_id,
                reviewed_at: m.reviewed_at.map(|t| t.into()),
                created_at: m.created_at.into(),
                updated_at: m.updated_at.into(),
                version: m.version,
            })
            .collect())
    }

    async fn count_leave_requests(&self, _tenant_id: &TenantId) -> Result<u64, PauseDomainError> {
        Ok(0)
    }

    async fn list_with_employee_names(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<(LeaveRequest, String)>, PauseDomainError> {
        let models = leave_request_entity::Entity::find()
            .filter(leave_request_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(map_err)?;

        let mut employee_ids = Vec::new();
        for m in &models {
            employee_ids.push(m.employee_id);
        }

        let employees = employee_entity::Entity::find()
            .filter(employee_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(employee_entity::Column::Id.is_in(employee_ids))
            .all(&self.db)
            .await
            .map_err(map_err)?;

        let employee_map: std::collections::HashMap<Uuid, String> =
            employees.into_iter().map(|e| (e.id, e.full_name)).collect();

        let mut results = Vec::new();
        for m in models {
            let lr = LeaveRequest {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                employee_id: m.employee_id,
                leave_type: leave_type_from_str(&m.leave_type),
                start_date: m.start_date,
                end_date: m.end_date,
                reason: m.reason,
                status: leave_status_from_str(&m.status),
                reviewer_id: m.reviewer_id,
                reviewed_at: m.reviewed_at.map(|t| t.into()),
                created_at: m.created_at.into(),
                updated_at: m.updated_at.into(),
                version: m.version,
            };
            let name = employee_map
                .get(&m.employee_id)
                .cloned()
                .unwrap_or_default();
            results.push((lr, name));
        }
        Ok(results)
    }
}

#[async_trait]
impl EmployeeDocumentRepository for PauseRepositoryImpl {
    async fn save_document(&self, doc: &EmployeeDocument) -> Result<(), PauseDomainError> {
        let active = employee_document_entity::ActiveModel {
            id: Set(doc.id),
            tenant_id: Set(doc.tenant_id.as_uuid()),
            employee_id: Set(doc.employee_id),
            file_name: Set(doc.file_name.clone()),
            file_url: Set(doc.file_url.clone()),
            doc_type: Set(doc.doc_type.clone()),
            created_at: Set(doc.created_at),
        };
        employee_document_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(map_err)?;
        Ok(())
    }

    async fn list_documents_for_employee(
        &self,
        tenant_id: &TenantId,
        employee_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<EmployeeDocument>, PauseDomainError> {
        let models = employee_document_entity::Entity::find()
            .filter(employee_document_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(employee_document_entity::Column::EmployeeId.eq(employee_id))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(map_err)?;

        Ok(models
            .into_iter()
            .map(|m| EmployeeDocument {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                employee_id: m.employee_id,
                file_name: m.file_name,
                file_url: m.file_url,
                doc_type: m.doc_type,
                created_at: m.created_at.into(),
            })
            .collect())
    }
}
