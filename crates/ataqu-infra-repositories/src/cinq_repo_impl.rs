//! SeaORM-based repositories for CINQ domain.
use async_trait::async_trait;
use sea_orm::{
    ColumnTrait, Condition, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect,
    Set,
};
use uuid::Uuid;

use ataqu_domain_cinq::activity::{Activity, ActivityType};
use ataqu_domain_cinq::contact::Contact;
use ataqu_domain_cinq::deal::{Deal, DealStatus};
use ataqu_domain_cinq::error::CinqDomainError;
use ataqu_domain_cinq::pipeline::PipelineStage;
use ataqu_domain_cinq::repository::{
    ActivityRepository as DomainActivityRepo, ContactRepository as DomainContactRepo,
    DealRepository as DomainDealRepo, PipelineStageRepository as DomainPipelineRepo,
};
use ataqu_kernel::TenantId;
use ataqu_security::{Email, PhoneNumber};

use crate::entities::contact as contact_entity;
use crate::entities::deal as deal_entity;

// Define activity and pipeline_stage entities in their own modules
mod activity_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "activities", schema_name = "collab_crm")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub contact_id: Uuid,
        pub deal_id: Option<Uuid>,
        pub activity_type: String,
        pub description: String,
        pub scheduled_at: Option<DateTime<Utc>>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod pipeline_stage_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "pipeline_stages", schema_name = "collab_crm")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub name: String,
        pub order: i32,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

// ---------- Contact Repository ----------
pub struct CinqContactRepository {
    db: DatabaseConnection,
}
impl CinqContactRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn contact_to_active(contact: &Contact) -> contact_entity::ActiveModel {
    contact_entity::ActiveModel {
        id: Set(contact.id),
        tenant_id: Set(contact.tenant_id.as_uuid()),
        name: Set(contact.name.clone()),
        email: Set(Some(contact.email.as_ref().to_string())),
        phone: Set(contact.phone.as_ref().map(|p| p.as_ref().to_string())),
        custom_fields: Set(serde_json::json!({})),
        created_at: Set(contact.created_at),
        updated_at: Set(contact.updated_at),
    }
}

fn model_to_contact(model: contact_entity::Model) -> Contact {
    let email = Email::new(model.email.unwrap_or_default());
    let phone = model.phone.map(PhoneNumber::new);
    Contact {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        name: model.name,
        email,
        phone,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

#[async_trait]
impl DomainContactRepo for CinqContactRepository {
    async fn save_contact(&self, contact: &Contact) -> Result<(), CinqDomainError> {
        let active = contact_to_active(contact);
        let exists = contact_entity::Entity::find_by_id(contact.id)
            .one(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?
            .is_some();
        if exists {
            contact_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        } else {
            contact_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        }
        Ok(())
    }

    async fn find_contact_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> Result<Option<Contact>, CinqDomainError> {
        let model = contact_entity::Entity::find()
            .filter(contact_entity::Column::Id.eq(id))
            .filter(contact_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        Ok(model.map(model_to_contact))
    }

    async fn list_contacts(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Contact>, CinqDomainError> {
        let models = contact_entity::Entity::find()
            .filter(contact_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        Ok(models.into_iter().map(model_to_contact).collect())
    }

    async fn search_contacts(
        &self,
        tenant_id: &TenantId,
        query: &str,
        limit: u64,
    ) -> Result<Vec<Contact>, CinqDomainError> {
        let cond = Condition::any()
            .add(contact_entity::Column::Name.ilike(format!("%{}%", query)))
            .add(contact_entity::Column::Email.ilike(format!("%{}%", query)));
        let models = contact_entity::Entity::find()
            .filter(contact_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(cond)
            .limit(limit)
            .all(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        Ok(models.into_iter().map(model_to_contact).collect())
    }

    async fn delete_contact(&self, tenant_id: &TenantId, id: Uuid) -> Result<(), CinqDomainError> {
        let result = contact_entity::Entity::delete_many()
            .filter(contact_entity::Column::Id.eq(id))
            .filter(contact_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        if result.rows_affected == 0 {
            return Err(CinqDomainError::Validation("Contact not found".to_string()));
        }
        Ok(())
    }
}

// ---------- Deal Repository ----------
pub struct CinqDealRepository {
    db: DatabaseConnection,
}
impl CinqDealRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn deal_to_active(deal: &Deal) -> deal_entity::ActiveModel {
    let amount_decimal = deal.amount;
    deal_entity::ActiveModel {
        id: Set(deal.id),
        tenant_id: Set(deal.tenant_id.as_uuid()),
        contact_id: Set(deal.contact_id),
        title: Set(deal.title.clone()),
        amount: Set(amount_decimal),
        status: Set(match deal.status {
            DealStatus::Open => "open",
            DealStatus::Won => "won",
            DealStatus::Lost => "lost",
        }
        .to_string()),
        pipeline_stage_id: Set(deal.pipeline_stage_id),
        custom_fields: Set(serde_json::json!({})),
        created_at: Set(deal.created_at),
        updated_at: Set(deal.updated_at),
    }
}

fn model_to_deal(model: deal_entity::Model) -> Deal {
    let status = match model.status.as_str() {
        "won" => DealStatus::Won,
        "lost" => DealStatus::Lost,
        _ => DealStatus::Open,
    };
    let amount = model.amount;
    Deal {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        contact_id: model.contact_id,
        title: model.title,
        pipeline_stage_id: model.pipeline_stage_id,
        amount,
        status,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

#[async_trait]
impl DomainDealRepo for CinqDealRepository {
    async fn save_deal(&self, deal: &Deal) -> Result<(), CinqDomainError> {
        let active = deal_to_active(deal);
        let exists = deal_entity::Entity::find_by_id(deal.id)
            .one(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?
            .is_some();
        if exists {
            deal_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        } else {
            deal_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        }
        Ok(())
    }

    async fn find_deal_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> Result<Option<Deal>, CinqDomainError> {
        let model = deal_entity::Entity::find()
            .filter(deal_entity::Column::Id.eq(id))
            .filter(deal_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        Ok(model.map(model_to_deal))
    }

    async fn list_deals(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Deal>, CinqDomainError> {
        let models = deal_entity::Entity::find()
            .filter(deal_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        Ok(models.into_iter().map(model_to_deal).collect())
    }

    async fn delete_deal(&self, tenant_id: &TenantId, id: Uuid) -> Result<(), CinqDomainError> {
        let result = deal_entity::Entity::delete_many()
            .filter(deal_entity::Column::Id.eq(id))
            .filter(deal_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        if result.rows_affected == 0 {
            return Err(CinqDomainError::Validation("Deal not found".to_string()));
        }
        Ok(())
    }
}

// ---------- Activity Repository ----------
pub struct CinqActivityRepository {
    db: DatabaseConnection,
}
impl CinqActivityRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn activity_type_to_str(t: ActivityType) -> &'static str {
    match t {
        ActivityType::Call => "call",
        ActivityType::Email => "email",
        ActivityType::Meeting => "meeting",
        ActivityType::Task => "task",
        ActivityType::Note => "note",
    }
}

fn str_to_activity_type(s: &str) -> ActivityType {
    match s {
        "call" => ActivityType::Call,
        "email" => ActivityType::Email,
        "meeting" => ActivityType::Meeting,
        "task" => ActivityType::Task,
        _ => ActivityType::Note,
    }
}

fn activity_to_model(activity: &Activity) -> activity_entity::ActiveModel {
    activity_entity::ActiveModel {
        id: Set(activity.id),
        tenant_id: Set(activity.tenant_id.as_uuid()),
        contact_id: Set(activity.contact_id),
        deal_id: Set(activity.deal_id),
        activity_type: Set(activity_type_to_str(activity.activity_type).to_string()),
        description: Set(activity.description.clone()),
        scheduled_at: Set(activity.scheduled_at),
        created_at: Set(activity.created_at),
        updated_at: Set(activity.updated_at),
    }
}

fn model_to_activity(model: activity_entity::Model) -> Activity {
    Activity {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        contact_id: model.contact_id,
        deal_id: model.deal_id,
        activity_type: str_to_activity_type(&model.activity_type),
        description: model.description,
        scheduled_at: model.scheduled_at,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

#[async_trait]
impl DomainActivityRepo for CinqActivityRepository {
    async fn save_activity(&self, activity: &Activity) -> Result<(), CinqDomainError> {
        let active = activity_to_model(activity);
        let exists = activity_entity::Entity::find_by_id(activity.id)
            .one(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?
            .is_some();
        if exists {
            activity_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        } else {
            activity_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        }
        Ok(())
    }

    async fn find_activity_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> Result<Option<Activity>, CinqDomainError> {
        let model = activity_entity::Entity::find()
            .filter(activity_entity::Column::Id.eq(id))
            .filter(activity_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        Ok(model.map(model_to_activity))
    }

    async fn list_activities_for_contact(
        &self,
        tenant_id: &TenantId,
        contact_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Activity>, CinqDomainError> {
        let models = activity_entity::Entity::find()
            .filter(activity_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(activity_entity::Column::ContactId.eq(contact_id))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        Ok(models.into_iter().map(model_to_activity).collect())
    }
}

// ---------- Pipeline Stage Repository ----------
pub struct CinqPipelineStageRepository {
    db: DatabaseConnection,
}
impl CinqPipelineStageRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn stage_to_model(stage: &PipelineStage) -> pipeline_stage_entity::ActiveModel {
    pipeline_stage_entity::ActiveModel {
        id: Set(stage.id),
        tenant_id: Set(stage.tenant_id.as_uuid()),
        name: Set(stage.name.clone()),
        order: Set(stage.order),
        created_at: Set(stage.created_at),
        updated_at: Set(stage.updated_at),
    }
}

fn model_to_stage(model: pipeline_stage_entity::Model) -> PipelineStage {
    PipelineStage {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        name: model.name,
        order: model.order,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

#[async_trait]
impl DomainPipelineRepo for CinqPipelineStageRepository {
    async fn save_pipeline_stage(&self, stage: &PipelineStage) -> Result<(), CinqDomainError> {
        let active = stage_to_model(stage);
        let exists = pipeline_stage_entity::Entity::find_by_id(stage.id)
            .one(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?
            .is_some();
        if exists {
            pipeline_stage_entity::Entity::update(active)
                .exec(&self.db)
                .await
                .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        } else {
            pipeline_stage_entity::Entity::insert(active)
                .exec(&self.db)
                .await
                .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        }
        Ok(())
    }

    async fn find_pipeline_stage_by_id(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> Result<Option<PipelineStage>, CinqDomainError> {
        let model = pipeline_stage_entity::Entity::find()
            .filter(pipeline_stage_entity::Column::Id.eq(id))
            .filter(pipeline_stage_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        Ok(model.map(model_to_stage))
    }

    async fn list_pipeline_stages(
        &self,
        tenant_id: &TenantId,
    ) -> Result<Vec<PipelineStage>, CinqDomainError> {
        let models = pipeline_stage_entity::Entity::find()
            .filter(pipeline_stage_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .order_by_asc(pipeline_stage_entity::Column::Order)
            .all(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        Ok(models.into_iter().map(model_to_stage).collect())
    }

    async fn delete_pipeline_stage(
        &self,
        tenant_id: &TenantId,
        id: Uuid,
    ) -> Result<(), CinqDomainError> {
        let result = pipeline_stage_entity::Entity::delete_many()
            .filter(pipeline_stage_entity::Column::Id.eq(id))
            .filter(pipeline_stage_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| CinqDomainError::Validation(e.to_string()))?;
        if result.rows_affected == 0 {
            return Err(CinqDomainError::Validation(
                "Pipeline stage not found".to_string(),
            ));
        }
        Ok(())
    }
}
