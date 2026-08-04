//! SeaORM implementations for SOND domain repository.
use async_trait::async_trait;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, IntoActiveModel, QuerySelect};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use ataqu_kernel::TenantId;
use ataqu_domain_sond::form::Form;
use ataqu_domain_sond::response::Response;
use ataqu_domain_sond::repository::SondRepository;
use ataqu_domain_sond::errors::SondError;

use crate::entities::sond::form as form_entity;
use crate::entities::sond::submission as submission_entity;

// ---------- Helpers ----------
fn form_model_to_domain(model: form_entity::Model) -> Form {
    Form {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        title: model.title,
        description: model.description,
        questions: Vec::new(),
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn submission_model_to_domain(model: submission_entity::Model) -> Response {
    Response {
        id: model.id,
        tenant_id: TenantId::new(model.tenant_id),
        form_id: model.form_id,
        answers: Vec::new(),
        respondent_id: model.respondent_id,
        submitted_at: model.submitted_at,
    }
}

pub struct SondRepositoryImpl {
    db: DatabaseConnection,
}

impl SondRepositoryImpl {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl SondRepository for SondRepositoryImpl {
    async fn get_form(&self, form_id: Uuid) -> Result<Option<Form>, SondError> {
        let model = form_entity::Entity::find()
            .filter(form_entity::Column::Id.eq(form_id))
            .one(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(model.map(form_model_to_domain))
    }

    async fn save_form(&self, form: &Form) -> Result<(), SondError> {
        let active = form_entity::ActiveModel {
            id: Set(form.id),
            tenant_id: Set(form.tenant_id.as_uuid()),
            title: Set(form.title.clone()),
            description: Set(form.description.clone()),
            schema_json: Set(serde_json::json!({})),
            is_active: Set(true),
            created_at: Set(form.created_at),
            updated_at: Set(form.updated_at),
        };
        form_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn get_response(&self, response_id: Uuid) -> Result<Option<Response>, SondError> {
        let model = submission_entity::Entity::find()
            .filter(submission_entity::Column::Id.eq(response_id))
            .one(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(model.map(submission_model_to_domain))
    }

    async fn save_response(&self, response: &Response) -> Result<(), SondError> {
        let active = submission_entity::ActiveModel {
            id: Set(response.id),
            tenant_id: Set(response.tenant_id.as_uuid()),
            form_id: Set(response.form_id),
            respondent_id: Set(response.respondent_id),
            response_data: Set(serde_json::json!({})),
            submitted_at: Set(response.submitted_at),
        };
        submission_entity::Entity::insert(active)
            .exec(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn list_forms(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> Result<Vec<Form>, SondError> {
        let models = form_entity::Entity::find()
            .filter(form_entity::Column::TenantId.eq(tenant_id.as_uuid()))
            .limit(limit)
            .offset(offset)
            .all(&self.db)
            .await
            .map_err(|e| SondError::Repository(e.to_string()))?;
        Ok(models.into_iter().map(form_model_to_domain).collect())
    }
}
