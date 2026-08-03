//! SOND survey service – in-memory forms and submissions.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;
use serde_json::Value;

use ataqu_kernel::{Clock, IdGenerator, TenantId};

#[derive(Debug, Clone)]
pub struct Form {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub title: String,
    pub description: Option<String>,
    pub schema: Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct Submission {
    pub id: Uuid,
    pub form_id: Uuid,
    pub tenant_id: TenantId,
    pub respondent_id: Option<Uuid>,
    pub data: Value,
    pub submitted_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateFormCommand {
    pub tenant_id: TenantId,
    pub title: String,
    pub description: Option<String>,
    pub schema: Value,
}

#[derive(Debug, Clone)]
pub struct SubmitResponseCommand {
    pub tenant_id: TenantId,
    pub form_id: Uuid,
    pub respondent_id: Option<Uuid>,
    pub data: Value,
}

#[derive(Debug, thiserror::Error)]
pub enum SondServiceError {
    #[error("Form not found")]
    FormNotFound,
    #[error("Submission failed: {0}")]
    Validation(String),
    #[error("Internal error")]
    Internal,
}

pub type SondResult<T> = Result<T, SondServiceError>;

#[derive(Default)]
struct FormStore {
    forms: Arc<RwLock<HashMap<Uuid, Form>>>,
}

#[derive(Default)]
struct SubmissionStore {
    submissions: Arc<RwLock<Vec<Submission>>>,
}

pub struct SondService {
    forms: FormStore,
    submissions: SubmissionStore,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl SondService {
    pub fn new(id_gen: Arc<dyn IdGenerator>, clock: Arc<dyn Clock>) -> Self {
        Self {
            forms: FormStore::default(),
            submissions: SubmissionStore::default(),
            id_gen,
            clock,
        }
    }

    pub async fn create_form(&self, cmd: CreateFormCommand) -> SondResult<Form> {
        if cmd.title.trim().is_empty() {
            return Err(SondServiceError::Validation("Title cannot be empty".into()));
        }
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let form = Form {
            id,
            tenant_id: cmd.tenant_id,
            title: cmd.title,
            description: cmd.description,
            schema: cmd.schema,
            created_at: now,
        };
        self.forms.forms.write().unwrap().insert(id, form.clone());
        Ok(form)
    }

    pub async fn get_form(&self, tenant_id: TenantId, id: Uuid) -> SondResult<Form> {
        let map = self.forms.forms.read().unwrap();
        map.get(&id)
            .filter(|f| f.tenant_id == tenant_id)
            .cloned()
            .ok_or(SondServiceError::FormNotFound)
    }

    pub async fn submit_response(&self, cmd: SubmitResponseCommand) -> SondResult<Submission> {
        let _ = self.get_form(cmd.tenant_id, cmd.form_id).await?;
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let submission = Submission {
            id,
            form_id: cmd.form_id,
            tenant_id: cmd.tenant_id,
            respondent_id: cmd.respondent_id,
            data: cmd.data,
            submitted_at: now,
        };
        self.submissions.submissions.write().unwrap().push(submission.clone());
        Ok(submission)
    }

    pub async fn list_submissions(&self, tenant_id: TenantId, form_id: Uuid) -> SondResult<Vec<Submission>> {
        let _ = self.get_form(tenant_id, form_id).await?;
        let store = self.submissions.submissions.read().unwrap();
        let subs = store.iter()
            .filter(|s| s.tenant_id == tenant_id && s.form_id == form_id)
            .cloned()
            .collect();
        Ok(subs)
    }

    pub async fn list_forms(&self, tenant_id: TenantId) -> SondResult<Vec<Form>> {
        let map = self.forms.forms.read().unwrap();
        let forms = map.values().filter(|f| f.tenant_id == tenant_id).cloned().collect();
        Ok(forms)
    }
}
