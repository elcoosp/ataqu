use async_trait::async_trait;
use ataqu_domain_sond::errors::SondError;
use ataqu_domain_sond::form::Form;
use ataqu_domain_sond::repository::SondRepository;
use ataqu_domain_sond::response::Response;
use ataqu_kernel::TenantId;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};
use uuid::Uuid;

mod form_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "forms", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub title: String,
        pub description: Option<String>,
        pub questions: serde_json::Value,
        pub branding: serde_json::Value,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
        pub version: i32,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

mod response_entity {
    use chrono::{DateTime, Utc};
    use sea_orm::entity::prelude::*;
    use uuid::Uuid;

    #[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
    #[sea_orm(table_name = "responses", schema_name = "collab_ops")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub id: Uuid,
        pub tenant_id: Uuid,
        pub form_id: Uuid,
        pub answers: serde_json::Value,
        pub respondent_id: Option<Uuid>,
        pub submitted_at: DateTime<Utc>,
    }

    #[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
    pub enum Relation {}

    impl ActiveModelBehavior for ActiveModel {}
}

pub struct SondRepositoryImpl {
    db: DatabaseConnection,
}

impl SondRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

fn map_form_model_to_domain(m: form_entity::Model) -> Form {
    Form {
        id: m.id,
        tenant_id: TenantId::new(m.tenant_id),
        title: m.title,
        description: m.description,
        questions: serde_json::from_value(m.questions).unwrap_or_default(),
        branding: m.branding,
        created_at: m.created_at,
        updated_at: m.updated_at,
        version: m.version,
        mode: ataqu_domain_sond::form::FormMode::Standard,
    }
}

#[async_trait]
impl SondRepository for SondRepositoryImpl {
    async fn save_form(&self, form: &Form) -> Result<(), SondError> {
        let active = form_entity::ActiveModel {
            id: Set(form.id),
            tenant_id: Set(form.tenant_id.as_uuid()),
            title: Set(form.title.clone()),
            description: Set(form.description.clone()),
            questions: Set(
                serde_json::to_value(&form.questions).unwrap_or(serde_json::Value::Array(vec![]))
            ),
            branding: Set(form.branding.clone()),
            created_at: Set(form.created_at),
            updated_at: Set(form.updated_at),
            version: Set(form.version),
        };
        form_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn get_form(
        &self,
        tenant_id: TenantId,
        form_id: Uuid,
    ) -> Result<Option<Form>, SondError> {
        let model = form_entity::Entity::find()
            .filter(form_entity::Column::Id.eq(form_id))
            .filter(form_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .one(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(model.map(map_form_model_to_domain))
    }

    async fn get_form_by_id(&self, form_id: Uuid) -> Result<Option<Form>, SondError> {
        let model = form_entity::Entity::find()
            .filter(form_entity::Column::Id.eq(form_id))
            .one(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(model.map(map_form_model_to_domain))
    }

    async fn delete_form(&self, tenant_id: TenantId, form_id: Uuid) -> Result<(), SondError> {
        form_entity::Entity::delete_many()
            .filter(form_entity::Column::Id.eq(form_id))
            .filter(form_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .exec(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn delete_submission(&self, tenant_id: TenantId, submission_id: Uuid) -> Result<(), SondError> {
        use response_entity as entity;
        entity::Entity::delete_many()
            .filter(entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(entity::Column::Id.eq(submission_id))
            .exec(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn count_forms(&self, _tenant_id: &TenantId) -> Result<u64, SondError> {
        Ok(0)
    }

    async fn list_forms(
        &self,
        tenant_id: &TenantId,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Form>, SondError> {
        let models = form_entity::Entity::find()
            .filter(form_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .order_by_desc(form_entity::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(models.into_iter().map(map_form_model_to_domain).collect())
    }

    async fn save_response(&self, response: &Response) -> Result<(), SondError> {
        let active = response_entity::ActiveModel {
            id: Set(response.id),
            tenant_id: Set(response.tenant_id.as_uuid()),
            form_id: Set(response.form_id),
            answers: Set(
                serde_json::to_value(&response.answers).unwrap_or(serde_json::Value::Array(vec![]))
            ),
            respondent_id: Set(response.respondent_id),
            submitted_at: Set(response.submitted_at),
        };
        response_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn get_response(&self, response_id: Uuid) -> Result<Option<Response>, SondError> {
        let model = response_entity::Entity::find()
            .filter(response_entity::Column::Id.eq(response_id))
            .one(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;

        if let Some(m) = model {
            Ok(Some(Response {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                form_id: m.form_id,
                answers: serde_json::from_value(m.answers).unwrap_or_default(),
                respondent_id: m.respondent_id,
                submitted_at: m.submitted_at,
            }))
        } else {
            Ok(None)
        }
    }

    async fn list_responses(
        &self,
        tenant_id: &TenantId,
        form_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> Result<Vec<Response>, SondError> {
        let models = response_entity::Entity::find()
            .filter(response_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .filter(response_entity::Column::FormId.eq(form_id))
            .limit(limit)
            .offset(offset)
            .order_by_desc(response_entity::Column::SubmittedAt)
            .all(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;

        Ok(models
            .into_iter()
            .map(|m| Response {
                id: m.id,
                tenant_id: TenantId::new(m.tenant_id),
                form_id: m.form_id,
                answers: serde_json::from_value(m.answers).unwrap_or_default(),
                respondent_id: m.respondent_id,
                submitted_at: m.submitted_at,
            })
            .collect())
    }
}
