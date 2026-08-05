//! CINQ CRM orchestration service – uses domain repositories and outbox.
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use ataqu_domain_cinq::activity::{
    self as activity_domain, Activity, ActivityType, CreateActivityCommand as DomainCreateActivity,
};
use ataqu_domain_cinq::contact::{
    self as contact_domain, Contact, CreateContactCommand as DomainCreateContact,
    UpdateContactCommand as DomainUpdateContact,
};
use ataqu_domain_cinq::deal::{
    self as deal_domain, CreateDealCommand as DomainCreateDeal, Deal, DealStatus,
    UpdateDealCommand as DomainUpdateDeal,
};
use ataqu_domain_cinq::error::CinqDomainError;
use ataqu_domain_cinq::pipeline::{
    self as pipeline_domain, CreatePipelineStageCommand as DomainCreateStage, PipelineStage,
};
use ataqu_domain_cinq::repository::{
    ActivityRepository, ContactRepository, DealRepository, PipelineStageRepository,
};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_security::{Email, PhoneNumber};
use rust_decimal::Decimal;

use crate::outbox::Outbox;

// Application commands
#[derive(Debug, Clone)]
pub struct CreateContactCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub email: Email,
    pub phone: Option<PhoneNumber>,
    pub custom_fields: serde_json::Value,
    pub lead_score: Option<i32>,
}

#[derive(Debug, Clone)]
pub struct UpdateContactCommand {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: Option<String>,
    pub email: Option<Email>,
    pub phone: Option<Option<PhoneNumber>>,
    pub custom_fields: Option<serde_json::Value>,
    pub lead_score: Option<i32>,
}

#[derive(Debug, Clone)]
pub struct CreateDealCommand {
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub title: String,
    pub pipeline_stage_id: Uuid,
    pub amount: Decimal,
    pub status: DealStatus,
}

#[derive(Debug, Clone)]
pub struct UpdateDealCommand {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub contact_id: Option<Uuid>,
    pub title: Option<String>,
    pub pipeline_stage_id: Option<Uuid>,
    pub amount: Option<Decimal>,
    pub status: Option<DealStatus>,
}

#[derive(Debug, Clone)]
pub struct CreateActivityCommand {
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub deal_id: Option<Uuid>,
    pub activity_type: ActivityType,
    pub description: String,
    pub scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone)]
pub struct CreatePipelineStageCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub order: i32,
}

#[derive(Debug, thiserror::Error)]
pub enum CinqServiceError {
    #[error("Contact not found")]
    ContactNotFound,
    #[error("Deal not found")]
    DealNotFound,
    #[error("Activity not found")]
    ActivityNotFound,
    #[error("Pipeline stage not found")]
    PipelineStageNotFound,
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Domain error: {0}")]
    Domain(#[from] CinqDomainError),
    #[error("Repository error: {0}")]
    Repository(String),
}

pub type CinqResult<T> = Result<T, CinqServiceError>;

pub struct CinqService {
    contact_repo: Arc<dyn ContactRepository + Send + Sync>,
    deal_repo: Arc<dyn DealRepository + Send + Sync>,
    activity_repo: Arc<dyn ActivityRepository + Send + Sync>,
    task_repo: Arc<dyn ataqu_domain_cinq::repository::TaskRepository + Send + Sync>,
    stage_repo: Arc<dyn PipelineStageRepository + Send + Sync>,
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

const CINQ_SCHEMA: &str = "collab_crm";

impl CinqService {
    pub fn new(
        contact_repo: Arc<dyn ContactRepository + Send + Sync>,
        deal_repo: Arc<dyn DealRepository + Send + Sync>,
        activity_repo: Arc<dyn ActivityRepository + Send + Sync>,
    task_repo: Arc<dyn ataqu_domain_cinq::repository::TaskRepository + Send + Sync>,
        stage_repo: Arc<dyn PipelineStageRepository + Send + Sync>,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            contact_repo,
            deal_repo,
            activity_repo,
            task_repo,
            stage_repo,
            outbox,
            id_gen,
            clock,
        }
    }

    // ---------- Contacts ----------
    pub async fn create_contact(&self, cmd: CreateContactCommand) -> CinqResult<Contact> {
        let domain_cmd = DomainCreateContact {
            tenant_id: cmd.tenant_id,
            name: cmd.name.clone(),
            email: cmd.email.clone(),
            phone: cmd.phone.clone(),
            custom_fields: cmd.custom_fields.clone(),
            lead_score: cmd.lead_score,
        };
        let event = contact_domain::create_contact(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
        let contact = Contact {
            id: event.id,
            tenant_id: event.tenant_id,
            name: event.name.clone(),
            email: event.email.clone(),
            phone: event.phone.clone(),
            custom_fields: event.custom_fields.clone(),
            lead_score: event.lead_score,
            created_at: event.created_at,
            updated_at: event.created_at,
        };
        self.contact_repo.save_contact(&contact).await?;

        let payload = serde_json::json!({
            "contact_id": contact.id,
            "tenant_id": contact.tenant_id.as_uuid(),
            "name": contact.name,
            "email": "[REDACTED]",
            "created_at": contact.created_at,
        });
        self.outbox
            .append(CINQ_SCHEMA, "ContactCreated", contact.id, &payload)
            .await
            .map_err(|e| CinqServiceError::Repository(e))?;

        Ok(contact)
    }

    pub async fn update_contact(&self, cmd: UpdateContactCommand) -> CinqResult<Contact> {
        let mut contact = self
            .contact_repo
            .find_contact_by_id(&cmd.tenant_id, cmd.id)
            .await?
            .ok_or(CinqServiceError::ContactNotFound)?;
        let domain_cmd = DomainUpdateContact {
            id: cmd.id,
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            email: cmd.email,
            phone: cmd.phone,
            custom_fields: cmd.custom_fields,
            lead_score: cmd.lead_score,
        };
        let event = contact_domain::update_contact(domain_cmd, self.clock.as_ref());
        if let Some(name) = event.name {
            contact.name = name;
        }
        if let Some(email) = event.email {
            contact.email = email;
        }
        if let Some(phone) = event.phone {
            contact.phone = phone;
        }
        if let Some(custom_fields) = event.custom_fields {
            contact.custom_fields = custom_fields;
        }
        if let Some(lead_score) = cmd.lead_score {
            contact.lead_score = lead_score;
        }
        contact.updated_at = event.updated_at;
        self.contact_repo.save_contact(&contact).await?;
        Ok(contact)
    }

    pub async fn delete_contact(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<()> {
        self.contact_repo.delete_contact(&tenant_id, id).await?;
        Ok(())
    }

    pub async fn get_contact(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<Contact> {
        self.contact_repo
            .find_contact_by_id(&tenant_id, id)
            .await?
            .ok_or(CinqServiceError::ContactNotFound)
    }

    pub async fn list_contacts(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> CinqResult<Vec<Contact>> {
        Ok(self
            .contact_repo
            .list_contacts(&tenant_id, limit, offset)
            .await?)
    }

    pub async fn search_contacts(
        &self,
        tenant_id: TenantId,
        query: &str,
        limit: u64,
    ) -> CinqResult<Vec<Contact>> {
        Ok(self
            .contact_repo
            .search_contacts(&tenant_id, query, limit)
            .await?)
    }

    pub async fn search_by_custom_field(
        &self,
        tenant_id: TenantId,
        field: &str,
        value: serde_json::Value,
    ) -> CinqResult<Vec<Contact>> {
        Ok(self
            .contact_repo
            .find_by_custom_field_exact(&tenant_id, field, &value)
            .await?)
    }

    pub async fn search_by_custom_field_text(
        &self,
        tenant_id: TenantId,
        field: &str,
        search: &str,
    ) -> CinqResult<Vec<Contact>> {
        Ok(self
            .contact_repo
            .find_by_custom_field_text(&tenant_id, field, search)
            .await?)
    }

    pub async fn search_custom_fields_cross(
        &self,
        tenant_id: TenantId,
        search: &str,
        limit: u64,
    ) -> CinqResult<Vec<Contact>> {
        Ok(self
            .contact_repo
            .find_by_custom_fields_cross(&tenant_id, search, limit)
            .await?)
    }

    pub async fn import_contacts(
        &self,
        tenant_id: TenantId,
        rows: Vec<HashMap<String, String>>,
    ) -> CinqResult<(usize, usize)> {
        let mut inserted = 0;
        let mut failed = 0;
        for row in rows {
            let name = row.get("name").or_else(|| row.get("Name")).or_else(|| row.get("NAME")).cloned().unwrap_or_default();
            let email_str = row.get("email").or_else(|| row.get("Email")).or_else(|| row.get("EMAIL")).cloned().unwrap_or_default();
            let phone_str = row.get("phone").or_else(|| row.get("Phone")).or_else(|| row.get("PHONE")).cloned().unwrap_or_default();

            if name.trim().is_empty() || email_str.trim().is_empty() || !email_str.contains('@') {
                failed += 1;
                continue;
            }

            let mut custom = serde_json::Map::new();
            for (k, v) in &row {
                let k_lower = k.to_lowercase();
                if !["name", "email", "phone"].contains(&k_lower.as_str()) {
                    custom.insert(k.clone(), serde_json::Value::String(v.clone()));
                }
            }
            let domain_cmd = DomainCreateContact {
                tenant_id,
                name: name.clone(),
                email: Email::new(email_str.clone()),
                phone: if phone_str.is_empty() {
                    None
                } else {
                    Some(PhoneNumber::new(phone_str.clone()))
                },
                custom_fields: serde_json::Value::Object(custom),
                lead_score: None,
            };
            let event = contact_domain::create_contact(
                domain_cmd,
                self.id_gen.as_ref(),
                self.clock.as_ref(),
            );
            let contact = Contact {
                id: event.id,
                tenant_id: event.tenant_id,
                name: event.name,
                email: event.email,
                phone: event.phone,
                custom_fields: event.custom_fields,
                lead_score: event.lead_score,
                created_at: event.created_at,
                updated_at: event.created_at,
            };
            if self.contact_repo.save_contact(&contact).await.is_ok() {
                inserted += 1;
            } else {
                failed += 1;
            }
        }
        Ok((inserted, failed))
    }

    pub async fn export_contacts(&self, tenant_id: TenantId) -> CinqResult<String> {
        use csv::Writer;
        let contacts = self
            .contact_repo
            .list_contacts(&tenant_id, 10000, 0)
            .await?;
        let mut wtr = Writer::from_writer(vec![]);
        wtr.write_record(["id", "name", "email", "phone", "created_at"])
            .map_err(|e| CinqServiceError::Validation(e.to_string()))?;
        for c in contacts {
            wtr.write_record(&[
                c.id.to_string(),
                c.name.clone(),
                c.email.reveal(&ataqu_security::PiiAccessKey::new_for_test()).to_string(),
                c.phone
                    .as_ref()
                    .map(|p| p.reveal(&ataqu_security::PiiAccessKey::new_for_test()).to_string())
                    .unwrap_or_default(),
                c.created_at.to_rfc3339(),
            ])
            .map_err(|e| CinqServiceError::Validation(e.to_string()))?;
        }
        let data = String::from_utf8(
            wtr.into_inner()
                .map_err(|e| CinqServiceError::Validation(e.to_string()))?,
        )
        .map_err(|e| CinqServiceError::Validation(e.to_string()))?;
        Ok(data)
    }

    // ---------- Deals ----------
    pub async fn create_deal(&self, cmd: CreateDealCommand) -> CinqResult<Deal> {
        let _ = self.get_contact(cmd.tenant_id, cmd.contact_id).await?;
        let domain_cmd = DomainCreateDeal {
            tenant_id: cmd.tenant_id,
            contact_id: cmd.contact_id,
            title: cmd.title.clone(),
            pipeline_stage_id: cmd.pipeline_stage_id,
            amount: cmd.amount,
            status: cmd.status,
        };
        let event =
            deal_domain::create_deal(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())?;
        let deal = Deal {
            id: event.id,
            tenant_id: event.tenant_id,
            contact_id: event.contact_id,
            title: event.title.clone(),
            pipeline_stage_id: event.pipeline_stage_id,
            amount: event.amount,
            status: event.status,
            created_at: event.created_at,
            updated_at: event.created_at,
        };
        self.deal_repo.save_deal(&deal).await?;

        let payload = serde_json::json!({
            "deal_id": deal.id,
            "tenant_id": deal.tenant_id.as_uuid(),
            "contact_id": deal.contact_id,
            "title": deal.title,
            "amount": deal.amount,
            "status": format!("{:?}", deal.status),
            "pipeline_stage_id": deal.pipeline_stage_id,
            "created_at": deal.created_at,
        });
        self.outbox
            .append(CINQ_SCHEMA, "DealCreated", deal.id, &payload)
            .await
            .map_err(|e| CinqServiceError::Repository(e))?;

        Ok(deal)
    }

    pub async fn update_deal(&self, cmd: UpdateDealCommand) -> CinqResult<Deal> {
        let mut deal = self
            .deal_repo
            .find_deal_by_id(&cmd.tenant_id, cmd.id)
            .await?
            .ok_or(CinqServiceError::DealNotFound)?;
        let domain_cmd = DomainUpdateDeal {
            id: cmd.id,
            tenant_id: cmd.tenant_id,
            contact_id: cmd.contact_id,
            title: cmd.title,
            pipeline_stage_id: cmd.pipeline_stage_id,
            amount: cmd.amount,
            status: cmd.status,
        };
        let event = deal_domain::update_deal(domain_cmd, self.clock.as_ref())?;
        if let Some(contact_id) = event.contact_id {
            deal.contact_id = contact_id;
        }
        if let Some(title) = event.title {
            deal.title = title;
        }
        if let Some(stage_id) = event.pipeline_stage_id {
            deal.pipeline_stage_id = stage_id;
        }
        if let Some(amount) = event.amount {
            deal.amount = amount;
        }
        if let Some(status) = event.status {
            deal.status = status;
        }
        deal.updated_at = event.updated_at;
        self.deal_repo.save_deal(&deal).await?;

        if let Some(DealStatus::Won) = event.status {
            let payload = serde_json::json!({
                "deal_id": deal.id,
                "tenant_id": deal.tenant_id.as_uuid(),
                "contact_id": deal.contact_id,
                "amount": deal.amount,
                "title": deal.title,
            });
            self.outbox
                .append(CINQ_SCHEMA, "DealWon", deal.id, &payload)
                .await
                .map_err(|e| CinqServiceError::Repository(e))?;
        }

        Ok(deal)
    }

    pub async fn delete_deal(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<()> {
        self.deal_repo.delete_deal(&tenant_id, id).await?;
        Ok(())
    }

    pub async fn get_deal(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<Deal> {
        self.deal_repo
            .find_deal_by_id(&tenant_id, id)
            .await?
            .ok_or(CinqServiceError::DealNotFound)
    }

    pub async fn list_deals(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> CinqResult<Vec<Deal>> {
        Ok(self.deal_repo.list_deals(&tenant_id, limit, offset).await?)
    }

    // ---------- Activities ----------
    pub async fn create_activity(&self, cmd: CreateActivityCommand) -> CinqResult<Activity> {
        let _ = self.get_contact(cmd.tenant_id, cmd.contact_id).await?;
        let domain_cmd = DomainCreateActivity {
            tenant_id: cmd.tenant_id,
            contact_id: cmd.contact_id,
            deal_id: cmd.deal_id,
            activity_type: cmd.activity_type,
            description: cmd.description,
            scheduled_at: cmd.scheduled_at,
        };
        let event =
            activity_domain::create_activity(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
        let activity = Activity {
            id: event.id,
            tenant_id: event.tenant_id,
            contact_id: event.contact_id,
            deal_id: event.deal_id,
            activity_type: event.activity_type,
            description: event.description,
            scheduled_at: event.scheduled_at,
            created_at: event.created_at,
            updated_at: event.created_at,
        };
        self.activity_repo.save_activity(&activity).await?;
        Ok(activity)
    }

    pub async fn get_activity(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<Activity> {
        self.activity_repo
            .find_activity_by_id(&tenant_id, id)
            .await?
            .ok_or(CinqServiceError::ActivityNotFound)
    }

    pub async fn list_activities_for_contact(
        &self,
        tenant_id: TenantId,
        contact_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> CinqResult<Vec<Activity>> {
        Ok(self
            .activity_repo
            .list_activities_for_contact(&tenant_id, contact_id, limit, offset)
            .await?)
    }

    // ---------- Pipeline Stages ----------
    pub async fn create_pipeline_stage(
        &self,
        cmd: CreatePipelineStageCommand,
    ) -> CinqResult<PipelineStage> {
        let domain_cmd = DomainCreateStage {
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            order: cmd.order,
        };
        let event = pipeline_domain::create_pipeline_stage(
            domain_cmd,
            self.id_gen.as_ref(),
            self.clock.as_ref(),
        )?;
        let stage = PipelineStage {
            id: event.id,
            tenant_id: event.tenant_id,
            name: event.name,
            order: event.order,
            created_at: event.created_at,
            updated_at: event.created_at,
        };
        self.stage_repo.save_pipeline_stage(&stage).await?;
        Ok(stage)
    }

    pub async fn list_pipeline_stages(
        &self,
        tenant_id: TenantId,
    ) -> CinqResult<Vec<PipelineStage>> {
        Ok(self.stage_repo.list_pipeline_stages(&tenant_id).await?)
    }

    pub async fn get_pipeline_stage(
        &self,
        tenant_id: TenantId,
        id: Uuid,
    ) -> CinqResult<PipelineStage> {
        self.stage_repo
            .find_pipeline_stage_by_id(&tenant_id, id)
            .await?
            .ok_or(CinqServiceError::PipelineStageNotFound)
    }

    pub async fn update_pipeline_stage(
        &self,
        tenant_id: TenantId,
        id: Uuid,
        name: Option<String>,
        order: Option<i32>,
    ) -> CinqResult<PipelineStage> {
        let mut stage = self
            .stage_repo
            .find_pipeline_stage_by_id(&tenant_id, id)
            .await?
            .ok_or(CinqServiceError::PipelineStageNotFound)?;
        if let Some(name) = name {
            stage.name = name;
        }
        if let Some(order) = order {
            stage.order = order;
        }
        self.stage_repo.save_pipeline_stage(&stage).await?;
        Ok(stage)
    }

    pub async fn delete_pipeline_stage(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<()> {
        self.stage_repo
            .delete_pipeline_stage(&tenant_id, id)
            .await?;
        Ok(())
    }

    pub async fn create_task(&self, cmd: ataqu_domain_cinq::task::CreateTaskCommand) -> CinqResult<ataqu_domain_cinq::task::Task> {
        let event = ataqu_domain_cinq::task::create_task(cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(CinqServiceError::Validation)?;
        let task = ataqu_domain_cinq::task::Task {
            id: event.id,
            tenant_id: event.tenant_id,
            contact_id: event.contact_id,
            deal_id: event.deal_id,
            assigned_to: event.assigned_to,
            title: event.title,
            description: event.description,
            due_date: event.due_date,
            status: event.status,
            created_at: event.created_at,
            updated_at: event.created_at,
        };
        self.task_repo.save_task(&task).await?;
        Ok(task)
    }

    pub async fn get_task(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<ataqu_domain_cinq::task::Task> {
        self.task_repo.find_task_by_id(&tenant_id, id).await?
            .ok_or(CinqServiceError::Validation("Task not found".to_string()))
    }

    pub async fn list_tasks(&self, tenant_id: TenantId, limit: u64, offset: u64) -> CinqResult<Vec<ataqu_domain_cinq::task::Task>> {
        Ok(self.task_repo.list_tasks(&tenant_id, limit, offset).await?)
    }

    pub async fn list_tasks_for_contact(&self, tenant_id: TenantId, contact_id: Uuid, limit: u64, offset: u64) -> CinqResult<Vec<ataqu_domain_cinq::task::Task>> {
        Ok(self.task_repo.list_tasks_for_contact(&tenant_id, contact_id, limit, offset).await?)
    }

    pub async fn update_task(&self, cmd: ataqu_domain_cinq::task::UpdateTaskCommand) -> CinqResult<ataqu_domain_cinq::task::Task> {
        let mut task = self.get_task(cmd.tenant_id, cmd.id).await?;
        if let Some(title) = cmd.title { task.title = title; }
        if let Some(desc) = cmd.description { task.description = Some(desc); }
        if let Some(due) = cmd.due_date { task.due_date = Some(due); }
        if let Some(status) = cmd.status { task.status = status; }
        task.updated_at = self.clock.now().into();
        self.task_repo.save_task(&task).await?;
        Ok(task)
    }

    pub async fn delete_task(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<()> {
        self.task_repo.delete_task(&tenant_id, id).await?;
        Ok(())
    }
}
