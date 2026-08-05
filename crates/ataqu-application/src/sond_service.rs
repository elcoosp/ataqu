//! SOND application service – orchestrates forms and responses using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use ataqu_domain_sond::errors::SondError;
use ataqu_domain_sond::form as form_domain;
use ataqu_domain_sond::repository::SondRepository;
use ataqu_domain_sond::response as response_domain;
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use crate::outbox::Outbox;

// Re-export domain types for API layer
pub use ataqu_domain_sond::form::Form;
pub use ataqu_domain_sond::question::Question;
pub use ataqu_domain_sond::response::Response;

// Application commands
#[derive(Debug, Clone)]
pub struct CreateFormCommand {
    pub tenant_id: TenantId,
    pub title: String,
    pub description: Option<String>,
    pub questions: Vec<ataqu_domain_sond::question::QuestionInput>,
}

#[derive(Debug, Clone)]
pub struct SubmitResponseCommand {
    pub tenant_id: TenantId,
    pub form_id: Uuid,
    pub answers: Vec<ataqu_domain_sond::response::AnswerInput>,
    pub respondent_id: Option<Uuid>,
}

#[derive(Debug, thiserror::Error)]
pub enum SondServiceError {
    #[error("Form not found")]
    FormNotFound,
    #[error("Response not found")]
    ResponseNotFound,
    #[error("Repository error: {0}")]
    Repository(String),
    #[error("Domain error: {0}")]
    Domain(#[from] SondError),
    #[error("Validation error: {0}")]
    Validation(String),
}

pub type SondResult<T> = Result<T, SondServiceError>;

pub struct SondService {
    repo: Arc<dyn SondRepository + Send + Sync>,
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl SondService {
    pub fn new(
        repo: Arc<dyn SondRepository + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            repo,
            outbox,
            id_gen,
            clock,
        }
    }

    pub async fn create_form(&self, cmd: CreateFormCommand) -> SondResult<Form> {
        let domain_cmd = form_domain::CreateFormCommand {
            tenant_id: cmd.tenant_id,
            title: cmd.title,
            description: cmd.description,
            questions: cmd.questions.clone(),
        };
        let event =
            form_domain::create_form(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())?;
        let questions: Vec<ataqu_domain_sond::question::Question> = cmd
            .questions
            .into_iter()
            .map(|qi| qi.into_question(self.id_gen.as_ref()))
            .collect();
        let form = Form {
            id: event.id,
            tenant_id: event.tenant_id,
            title: event.title,
            description: event.description,
            questions,
            created_at: event.created_at,
            updated_at: event.created_at,
        };
        self.repo
            .save_form(&form)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))?;
        Ok(form)
    }

    pub async fn get_form(&self, tenant_id: TenantId, form_id: Uuid) -> SondResult<Form> {
        self.repo
            .get_form(tenant_id, form_id)
            .await?
            .ok_or(SondServiceError::FormNotFound)
    }

    pub async fn update_form(&self, tenant_id: TenantId, cmd: ataqu_domain_sond::form::UpdateFormCommand) -> SondResult<Form> {
        let current_form = self.get_form(tenant_id, cmd.form_id).await?;
        let questions_clone = cmd.questions.clone();
        let event = ataqu_domain_sond::form::update_form(cmd, &current_form, self.id_gen.as_ref(), self.clock.as_ref())?;

        let mut form = current_form;
        if let Some(title) = event.title { form.title = title; }
        if let Some(desc) = event.description { form.description = Some(desc); }
        if let Some(qs) = questions_clone {
            form.questions = qs.into_iter().map(|qi| qi.into_question(self.id_gen.as_ref())).collect();
        }
        form.updated_at = event.updated_at;

        self.repo.save_form(&form).await.map_err(|e| SondServiceError::Repository(e.to_string()))?;
        Ok(form)
    }

    pub async fn delete_form(&self, tenant_id: TenantId, form_id: Uuid) -> SondResult<()> {
        self.repo.delete_form(tenant_id, form_id).await.map_err(|e| SondServiceError::Repository(e.to_string()))
    }

    pub async fn list_forms(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> SondResult<Vec<Form>> {
        self.repo
            .list_forms(&tenant_id, limit, offset)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))
    }

    pub async fn submit_response(&self, cmd: SubmitResponseCommand) -> SondResult<Response> {
        let form = self
            .repo
            .get_form(cmd.tenant_id, cmd.form_id)
            .await?
            .ok_or(SondServiceError::FormNotFound)?;
        let domain_cmd = response_domain::SubmitResponseCommand {
            tenant_id: cmd.tenant_id,
            form_id: cmd.form_id,
            answers: cmd.answers.clone(),
            respondent_id: cmd.respondent_id,
        };
        let event = response_domain::submit_response(
            domain_cmd,
            &form,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        )?;
        let validated = response_domain::validate_answers(&cmd.answers, &form.questions)?;
        let response = Response {
            id: event.id,
            tenant_id: event.tenant_id,
            form_id: event.form_id,
            answers: validated,
            respondent_id: cmd.respondent_id,
            submitted_at: event.submitted_at,
        };
        self.repo
            .save_response(&response)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))?;

        let payload = serde_json::json!({
            "response_id": response.id,
            "tenant_id": response.tenant_id.as_uuid(),
            "form_id": response.form_id,
            "email": "[REDACTED]",
            "name": "[REDACTED]",
        });
        self.outbox.append("sond", "ResponseSubmitted", response.id, &payload).await.map_err(|e| SondServiceError::Repository(e))?;

        Ok(response)
    }

    pub async fn get_response(&self, response_id: Uuid) -> SondResult<Response> {
        self.repo
            .get_response(response_id)
            .await?
            .ok_or(SondServiceError::ResponseNotFound)
    }

    pub async fn list_responses(
        &self,
        tenant_id: TenantId,
        form_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> SondResult<Vec<Response>> {
        self.repo
            .list_responses(&tenant_id, form_id, limit, offset)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))
    }
}
