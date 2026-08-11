//! Repository for pending approvals (SPARK workflow approvals).
use async_trait::async_trait;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter, QueryOrder,
    QuerySelect, Set,
};
use uuid::Uuid;

use ataqu_kernel::TenantId;

mod pending_approval_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "pending_approvals", schema_name = "collab_crm")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub workflow_id: Uuid,
        pub run_id: Uuid,
        pub approver_role: String,
        pub status: String,
        pub payload: serde_json::Value,
        pub approved_by: Option<Uuid>,
        pub approved_at: Option<DateTime<Utc>>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub struct PendingApproval {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub workflow_id: Uuid,
    pub run_id: Uuid,
    pub approver_role: String,
    pub status: String,
    pub payload: serde_json::Value,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[async_trait]
pub trait PendingApprovalRepository: Send + Sync {
    async fn create(&self, approval: &PendingApproval) -> Result<(), String>;
    async fn find_pending(&self, tenant_id: TenantId, limit: u64) -> Result<Vec<PendingApproval>, String>;
    async fn approve(&self, id: Uuid, approved_by: Uuid) -> Result<(), String>;
    async fn reject(&self, id: Uuid, approved_by: Uuid) -> Result<(), String>;
    async fn find_by_run_id(&self, tenant_id: TenantId, run_id: Uuid) -> Result<Option<PendingApproval>, String>;
}

pub struct SeaOrmPendingApprovalRepo {
    db: DatabaseConnection,
}

impl SeaOrmPendingApprovalRepo {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl PendingApprovalRepository for SeaOrmPendingApprovalRepo {
    async fn create(&self, approval: &PendingApproval) -> Result<(), String> {
        use pending_approval_entity as entity;
        let active = entity::ActiveModel {
            id: Set(approval.id),
            tenant_id: Set(approval.tenant_id.as_uuid()),
            workflow_id: Set(approval.workflow_id),
            run_id: Set(approval.run_id),
            approver_role: Set(approval.approver_role.clone()),
            status: Set(approval.status.clone()),
            payload: Set(approval.payload.clone()),
            approved_by: Set(approval.approved_by),
            approved_at: Set(approval.approved_at),
            created_at: Set(approval.created_at),
            updated_at: Set(approval.updated_at),
        };
        entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn find_pending(&self, tenant_id: TenantId, limit: u64) -> Result<Vec<PendingApproval>, String> {
        use pending_approval_entity as entity;
        let models = entity::Entity::find()
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(entity::Column::Status.eq("pending"))
            .order_by_asc(entity::Column::CreatedAt)
            .limit(limit)
            .all(&self.db)
            .await
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for m in models {
            results.push(PendingApproval {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                workflow_id: m.workflow_id,
                run_id: m.run_id,
                approver_role: m.approver_role,
                status: m.status,
                payload: m.payload,
                approved_by: m.approved_by,
                approved_at: m.approved_at,
                created_at: m.created_at,
                updated_at: m.updated_at,
            });
        }
        Ok(results)
    }

    async fn approve(&self, id: Uuid, approved_by: Uuid) -> Result<(), String> {
        use pending_approval_entity as entity;
        let mut active = entity::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Approval not found")?
            .into_active_model();
        active.status = Set("approved".to_string());
        active.approved_by = Set(Some(approved_by));
        active.approved_at = Set(Some(chrono::Utc::now()));
        active.updated_at = Set(chrono::Utc::now());
        entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn reject(&self, id: Uuid, approved_by: Uuid) -> Result<(), String> {
        use pending_approval_entity as entity;
        let mut active = entity::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Approval not found")?
            .into_active_model();
        active.status = Set("rejected".to_string());
        active.approved_by = Set(Some(approved_by));
        active.approved_at = Set(Some(chrono::Utc::now()));
        active.updated_at = Set(chrono::Utc::now());
        entity::Entity::update(active)
            .exec(&self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn find_by_run_id(&self, tenant_id: TenantId, run_id: Uuid) -> Result<Option<PendingApproval>, String> {
        use pending_approval_entity as entity;
        let model = entity::Entity::find()
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(entity::Column::RunId.eq(run_id))
            .one(&self.db)
            .await
            .map_err(|e| e.to_string())?;

        if let Some(m) = model {
            Ok(Some(PendingApproval {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                workflow_id: m.workflow_id,
                run_id: m.run_id,
                approver_role: m.approver_role,
                status: m.status,
                payload: m.payload,
                approved_by: m.approved_by,
                approved_at: m.approved_at,
                created_at: m.created_at,
                updated_at: m.updated_at,
            }))
        } else {
            Ok(None)
        }
    }
}
