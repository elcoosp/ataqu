//! SOND application service – orchestrates forms and responses using domain repositories.
use std::sync::Arc;
use uuid::Uuid;

use crate::outbox::Outbox;
use ataqu_domain_sond::errors::SondError;
use ataqu_domain_sond::form as form_domain;
use ataqu_domain_sond::repository::SondRepository;
use ataqu_domain_sond::response as response_domain;
use ataqu_kernel::{Clock, IdGenerator, TenantId};

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
    pub branding: serde_json::Value,
    pub mode: Option<form_domain::FormMode>,
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

#[derive(Debug, Clone)]
pub struct ConversationalStepResult {
    pub is_complete: bool,
    pub next_question_id: Option<Uuid>,
}

pub struct SondService {
    repo: Arc<dyn SondRepository + Send + Sync>,
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
    audit_repo: Option<Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>>,
}

impl SondService {
    pub fn new(
        repo: Arc<dyn SondRepository + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
        audit_repo: Option<
            Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>,
        >,
    ) -> Self {
        Self {
            repo,
            outbox,
            id_gen,
            clock,
            audit_repo,
        }
    }

    pub async fn create_form(&self, _user_id: Uuid, cmd: CreateFormCommand) -> SondResult<Form> {
        // TODO: Add audit log call using log_audit()

        // TODO: Add audit log call using crate::audit::log_audit

        let domain_cmd = form_domain::CreateFormCommand {
            tenant_id: cmd.tenant_id,
            title: cmd.title,
            description: cmd.description,
            questions: cmd.questions.clone(),
            branding: cmd.branding.clone(),
            mode: cmd.mode,
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
            branding: event.branding,
            mode: event.mode,
            routing_rules: event.routing_rules,
            created_at: event.created_at,
            updated_at: event.created_at,
            version: 0,
        };
        self.repo
            .save_form(&form)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))?;

        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    form.tenant_id,
                    Uuid::nil(),
                    "create_form",
                    "sond",
                    Some("form"),
                    Some(form.id),
                    None,
                    Some(serde_json::json!({"title": form.title})),
                    None,
                    None,
                )
                .await
                .ok();
        }

        let payload = serde_json::json!({
            "form_id": form.id,
            "tenant_id": form.tenant_id.as_uuid(),
            "title": form.title,
        });
        self.outbox
            .append("collab_ops", "FormCreated", form.id, &payload)
            .await
            .map_err(SondServiceError::Repository)?;

        Ok(form)
    }

    pub async fn get_form(&self, tenant_id: TenantId, form_id: Uuid) -> SondResult<Form> {
        self.repo
            .get_form(tenant_id, form_id)
            .await?
            .ok_or(SondServiceError::FormNotFound)
    }

    pub async fn get_form_public(&self, form_id: Uuid) -> SondResult<Form> {
        self.repo
            .get_form_by_id(form_id)
            .await?
            .ok_or(SondServiceError::FormNotFound)
    }

    pub async fn update_form(&self, _user_id: Uuid, tenant_id: TenantId,
        cmd: ataqu_domain_sond::form::UpdateFormCommand,) -> SondResult<Form> {
        // TODO: Add audit log call using log_audit()

        // TODO: Add audit log call using crate::audit::log_audit

        let current_form = self.get_form(tenant_id, cmd.form_id).await?;
        if current_form.version != cmd.expected_version {
            return Err(SondServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, current_form.version
            )));
        }
        let questions_clone = cmd.questions.clone();
        let event = ataqu_domain_sond::form::update_form(
            cmd,
            &current_form,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        )?;

        let mut form = current_form;
        if let Some(title) = event.title {
            form.title = title;
        }
        if let Some(desc) = event.description {
            form.description = Some(desc);
        }
        if let Some(qs) = questions_clone {
            form.questions = qs
                .into_iter()
                .map(|qi| qi.into_question(self.id_gen.as_ref()))
                .collect();
        }
        if let Some(mode) = event.mode {
            form.mode = mode;
        }
        if let Some(rules) = event.routing_rules {
            form.routing_rules = Some(rules);
        }
        form.updated_at = event.updated_at;
        form.version += 1;

        self.repo
            .save_form(&form)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))?;

        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    form.tenant_id,
                    Uuid::nil(),
                    "update_form",
                    "sond",
                    Some("form"),
                    Some(form.id),
                    None,
                    Some(serde_json::json!({"title": form.title})),
                    None,
                    None,
                )
                .await
                .ok();
        }

        let payload = serde_json::json!({
            "form_id": form.id,
            "tenant_id": form.tenant_id.as_uuid(),
            "title": form.title,
        });
        self.outbox
            .append("collab_ops", "FormUpdated", form.id, &payload)
            .await
            .map_err(SondServiceError::Repository)?;

        Ok(form)
    }

    pub async fn delete_form(&self, _user_id: Uuid, tenant_id: TenantId, form_id: Uuid) -> SondResult<()> {
        // TODO: Add audit log call using log_audit()

        // TODO: Add audit log call using crate::audit::log_audit

        self.repo
            .delete_form(tenant_id, form_id)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))
    }
    pub async fn delete_submission(&self, _user_id: Uuid, tenant_id: TenantId,
        submission_id: Uuid,) -> SondResult<()> {
        // TODO: Add audit log call using log_audit()

        // TODO: Add audit log call using crate::audit::log_audit

        self.repo
            .delete_submission(tenant_id, submission_id)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))
    }

    /// Update only the branding field of a form.
    pub async fn update_form_branding(&self, _user_id: Uuid, tenant_id: TenantId,
        form_id: Uuid,
        branding: serde_json::Value,) -> SondResult<Form> {
        // TODO: Add audit log call using log_audit()

        // TODO: Add audit log call using crate::audit::log_audit

        let mut form = self.get_form(tenant_id, form_id).await?;
        form.branding = branding;
        // We need to save the form; we'll use the repository directly to avoid version issues.
        self.repo.save_form(&form).await?;
        Ok(form)
    }

    /// Update the routing rules of a form.
    pub async fn update_form_routing(&self, _user_id: Uuid, tenant_id: TenantId,
        form_id: Uuid,
        rules: serde_json::Value,) -> SondResult<Form> {
        // TODO: Add audit log call using log_audit()

        // TODO: Add audit log call using crate::audit::log_audit

        let mut form = self.get_form(tenant_id, form_id).await?;
        form.routing_rules = Some(rules);
        self.repo.save_form(&form).await?;
        Ok(form)
    }

    pub async fn list_forms(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> SondResult<(Vec<Form>, u64)> {
        let total = self
            .repo
            .count_forms(&tenant_id)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))?;
        let forms = self
            .repo
            .list_forms(&tenant_id, limit, offset)
            .await
            .map_err(|e| SondServiceError::Repository(e.to_string()))?;
        Ok((forms, total))
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

        let email = response.answers.iter().find_map(|a| {
            if let ataqu_domain_sond::response::AnswerValue::Email(e) = &a.value {
                Some(e.clone())
            } else {
                None
            }
        });
        let name = response.answers.iter().find_map(|a| {
            if let ataqu_domain_sond::response::AnswerValue::Text(t) = &a.value {
                Some(t.clone())
            } else {
                None
            }
        });
        let payload = serde_json::json!({
            "response_id": response.id,
            "tenant_id": response.tenant_id.as_uuid(),
            "form_id": response.form_id,
            "email": email.unwrap_or_default(),
            "name": name.unwrap_or_else(|| "Form Lead".to_string()),
            "answers": response.answers
        });
        self.outbox
            .append("collab_ops", "ResponseSubmitted", response.id, &payload)
            .await
            .map_err(SondServiceError::Repository)?;

        Ok(response)
    }

    /// Validates a single answer in a conversational form flow.
    /// This is a stateless validation endpoint. The frontend is responsible for
    /// collecting all answers and submitting them via `submit_response` at the end.
    pub async fn submit_conversational_answer(
        &self,
        tenant_id: TenantId,
        form_id: Uuid,
        question_id: Uuid,
        answer: ataqu_domain_sond::response::AnswerInput,
    ) -> SondResult<ConversationalStepResult> {
        let form = self.get_form(tenant_id, form_id).await?;

        form_domain::validate_conversational_step(&form, question_id, &answer)
            .map_err(SondServiceError::Validation)?;

        let q_index = form
            .questions
            .iter()
            .position(|q| q.id == question_id)
            .ok_or_else(|| {
                SondServiceError::Validation(format!("Question {} not found", question_id))
            })?;

        let is_complete = q_index == form.questions.len() - 1;
        let next_question_id = if is_complete {
            None
        } else {
            Some(form.questions[q_index + 1].id)
        };

        Ok(ConversationalStepResult {
            is_complete,
            next_question_id,
        })
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
