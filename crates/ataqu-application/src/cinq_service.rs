//! CINQ CRM orchestration service – uses domain repositories and outbox.
use std::collections::HashMap;
use std::sync::Arc;
use sea_orm::DatabaseConnection;
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

#[derive(Debug, Clone)]
pub struct CreateContactCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub company: Option<String>,
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
    pub company: Option<Option<String>>,
    pub email: Option<Email>,
    pub phone: Option<Option<PhoneNumber>>,
    pub custom_fields: Option<serde_json::Value>,
    pub lead_score: Option<i32>,
    pub expected_version: i32,
}

#[derive(Debug, Clone)]
pub struct CreateDealCommand {
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub title: String,
    pub pipeline_stage_id: Uuid,
    pub amount: Decimal,
    pub status: DealStatus,
    pub owner_id: Option<Uuid>,
    pub probability: Option<i32>,
    pub variant_id: Option<Uuid>,
    pub quantity: Option<i64>,
    pub establishment_id: Option<Uuid>,
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
    pub owner_id: Option<Option<Uuid>>,
    pub probability: Option<Option<i32>>,
    pub variant_id: Option<Option<Uuid>>,
    pub quantity: Option<Option<i64>>,
    pub establishment_id: Option<Option<Uuid>>,
    pub expected_version: i32,
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
    #[error("Task not found")]
    TaskNotFound,
    #[error("Pipeline stage not found")]
    PipelineStageNotFound,
    #[error("Establishment not found: {0}")]
    EstablishmentNotFound(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Domain error: {0}")]
    Domain(#[from] CinqDomainError),
    #[error("Repository error: {0}")]
    Repository(String),
    #[error("Not found: {0}")]
    NotFound(String),
}

pub type CinqResult<T> = Result<T, CinqServiceError>;

pub struct CinqService {
    contact_repo: Arc<dyn ContactRepository + Send + Sync>,
    db: DatabaseConnection,
    deal_repo: Arc<dyn DealRepository + Send + Sync>,
    activity_repo: Arc<dyn ActivityRepository + Send + Sync>,
    task_repo: Arc<dyn ataqu_domain_cinq::repository::TaskRepository + Send + Sync>,
    stage_repo: Arc<dyn PipelineStageRepository + Send + Sync>,
    establishment_repo:
        Arc<dyn ataqu_domain_cinq::repository::EstablishmentRepository + Send + Sync>,
    outbox: Arc<dyn Outbox + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
    audit_repo: Option<Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>>,
}

const CINQ_SCHEMA: &str = "collab_crm";

#[derive(Debug, Clone)]
pub struct CreateEstablishmentCommand {
    pub tenant_id: TenantId,
    pub company_name: String,
    pub siret: Option<String>,
    pub address: Option<String>,
}

impl CinqService {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        db: DatabaseConnection,
        contact_repo: Arc<dyn ContactRepository + Send + Sync>,
        deal_repo: Arc<dyn DealRepository + Send + Sync>,
        activity_repo: Arc<dyn ActivityRepository + Send + Sync>,
        task_repo: Arc<dyn ataqu_domain_cinq::repository::TaskRepository + Send + Sync>,
        stage_repo: Arc<dyn PipelineStageRepository + Send + Sync>,
        establishment_repo: Arc<
            dyn ataqu_domain_cinq::repository::EstablishmentRepository + Send + Sync,
        >,
        outbox: Arc<dyn Outbox + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
        audit_repo: Option<
            Arc<dyn ataqu_domain_aegis::repository::AuditRepositoryTrait + Send + Sync>,
        >,

    ) -> Self {
        Self {
            db,
            contact_repo,
            deal_repo,
            activity_repo,
            task_repo,
            stage_repo,
            establishment_repo,
            outbox,
            id_gen,
            clock,
            audit_repo,
        }
    }

    pub async fn create_contact(&self, cmd: CreateContactCommand) -> CinqResult<Contact> {
        let domain_cmd = DomainCreateContact {
            tenant_id: cmd.tenant_id,
            name: cmd.name.clone(),
            company: cmd.company.clone(),
            email: cmd.email.clone(),
            phone: cmd.phone.clone(),
            custom_fields: cmd.custom_fields.clone(),
            lead_score: cmd.lead_score,
        };
        let event =
            contact_domain::create_contact(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())?;
        let contact = Contact {
            id: event.id,
            tenant_id: event.tenant_id,
            name: event.name.clone(),
            company: event.company.clone(),
            email: event.email.clone(),
            phone: event.phone.clone(),
            custom_fields: event.custom_fields.clone(),
            lead_score: event.lead_score,
            created_at: event.created_at,
            updated_at: event.created_at,
            version: 0,
        };
        self.contact_repo.save_contact(&contact).await?;

        // Audit log
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    contact.tenant_id,
                    Uuid::nil(), // System user for now, or should be passed in
                    "create_contact",
                    "cinq",
                    Some("contact"),
                    Some(contact.id),
                    None,
                    Some(serde_json::json!({"name": contact.name})),
                    None,
                    None,
                )
                .await
                .ok();
        }

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
            .map_err(CinqServiceError::Repository)?;

        Ok(contact)
    }

    pub async fn update_contact(&self, cmd: UpdateContactCommand) -> CinqResult<Contact> {
        let mut contact = self
            .contact_repo
            .find_contact_by_id(&cmd.tenant_id, cmd.id)
            .await?
            .ok_or(CinqServiceError::ContactNotFound)?;

        if contact.version != cmd.expected_version {
            return Err(CinqServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, contact.version
            )));
        }

        let domain_cmd = DomainUpdateContact {
            id: cmd.id,
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            company: cmd.company,
            email: cmd.email,
            phone: cmd.phone,
            custom_fields: cmd.custom_fields,
            lead_score: cmd.lead_score,
            expected_version: cmd.expected_version,
        };
        let event = contact_domain::update_contact(domain_cmd, self.clock.as_ref())?;
        if let Some(name) = event.name {
            contact.name = name;
        }
        if let Some(company) = event.company {
            contact.company = company;
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
        if let Some(lead_score) = event.lead_score {
            contact.lead_score = lead_score;
        }
        contact.updated_at = event.updated_at;
        contact.version = event.version;
        self.contact_repo.save_contact(&contact).await?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    contact.tenant_id,
                    Uuid::nil(),
                    "update_contact",
                    "cinq",
                    Some("contact"),
                    Some(contact.id),
                    None,
                    Some(serde_json::json!({"name": contact.name})),
                    None,
                    None,
                )
                .await
                .ok();
        }
        Ok(contact)
    }

    pub async fn delete_contact(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<()> {
        self.contact_repo.delete_contact(&tenant_id, id).await?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    tenant_id,
                    Uuid::nil(),
                    "delete_contact",
                    "cinq",
                    Some("contact"),
                    Some(id),
                    None,
                    None,
                    None,
                    None,
                )
                .await
                .ok();
        }
        Ok(())
    }

    pub async fn bulk_delete_contacts(
        &self,
        tenant_id: TenantId,
        ids: Vec<Uuid>,
    ) -> CinqResult<()> {
        for id in ids {
            self.contact_repo.delete_contact(&tenant_id, id).await?;
        }
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
    ) -> CinqResult<(Vec<Contact>, u64)> {
        let total = self.contact_repo.count_contacts(&tenant_id).await?;
        let contacts = self
            .contact_repo
            .list_contacts(&tenant_id, limit, offset)
            .await?;
        Ok((contacts, total))
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
        let mut seen_emails = std::collections::HashSet::new();

        for row in rows {
            let name = row
                .get("name")
                .or_else(|| row.get("Name"))
                .or_else(|| row.get("NAME"))
                .cloned()
                .unwrap_or_default();
            let email_str = row
                .get("email")
                .or_else(|| row.get("Email"))
                .or_else(|| row.get("EMAIL"))
                .cloned()
                .unwrap_or_default();
            let phone_str = row
                .get("phone")
                .or_else(|| row.get("Phone"))
                .or_else(|| row.get("PHONE"))
                .cloned()
                .unwrap_or_default();

            if name.trim().is_empty() || email_str.trim().is_empty() || !email_str.contains('@') {
                failed += 1;
                continue;
            }

            let email_lower = email_str.to_lowercase();
            if seen_emails.contains(&email_lower) {
                failed += 1;
                continue;
            }
            seen_emails.insert(email_lower);

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
                company: None,
                email: Email::new(email_str.clone()),
                phone: if phone_str.is_empty() {
                    None
                } else {
                    Some(PhoneNumber::new(phone_str.clone()))
                },
                custom_fields: serde_json::Value::Object(custom),
                lead_score: None,
            };
            let event = match contact_domain::create_contact(
                domain_cmd,
                self.id_gen.as_ref(),
                self.clock.as_ref(),
            ) {
                Ok(e) => e,
                Err(_) => {
                    failed += 1;
                    continue;
                }
            };
            let contact = Contact {
                id: event.id,
                tenant_id: event.tenant_id,
                name: event.name,
                company: event.company,
                email: event.email,
                phone: event.phone,
                custom_fields: event.custom_fields,
                lead_score: event.lead_score,
                created_at: event.created_at,
                updated_at: event.created_at,
                version: 0,
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
        let mut wtr = Writer::from_writer(vec![]);
        wtr.write_record(["id", "name", "email", "phone", "created_at"])
            .map_err(|e| CinqServiceError::Validation(e.to_string()))?;

        let page_size = 1000u64;
        let mut offset = 0u64;
        loop {
            let contacts = self
                .contact_repo
                .list_contacts(&tenant_id, page_size, offset)
                .await?;
            if contacts.is_empty() {
                break;
            }
            for c in contacts {
                wtr.write_record(&[
                    c.id.to_string(),
                    c.name.clone(),
                    c.email
                        .reveal(&ataqu_security::PiiAccessKey::new())
                        .to_string(),
                    c.phone
                        .as_ref()
                        .map(|p| p.reveal(&ataqu_security::PiiAccessKey::new()).to_string())
                        .unwrap_or_default(),
                    c.created_at.to_rfc3339(),
                ])
                .map_err(|e| CinqServiceError::Validation(e.to_string()))?;
            }
            offset += page_size;
        }

        let data = String::from_utf8(
            wtr.into_inner()
                .map_err(|e| CinqServiceError::Validation(e.to_string()))?,
        )
        .map_err(|e| CinqServiceError::Validation(e.to_string()))?;
        Ok(data)
    }

    pub async fn create_deal(&self, cmd: CreateDealCommand) -> CinqResult<Deal> {
        let _ = self.get_contact(cmd.tenant_id, cmd.contact_id).await?;
        if let Some(est_id) = cmd.establishment_id {
            let _ = self.get_establishment(cmd.tenant_id, est_id).await?;
        }
        let domain_cmd = DomainCreateDeal {
            tenant_id: cmd.tenant_id,
            contact_id: cmd.contact_id,
            title: cmd.title.clone(),
            pipeline_stage_id: cmd.pipeline_stage_id,
            amount: cmd.amount,
            status: cmd.status,
            owner_id: cmd.owner_id,
            probability: cmd.probability,
            variant_id: cmd.variant_id,
            quantity: cmd.quantity,
            establishment_id: cmd.establishment_id,
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
            owner_id: event.owner_id,
            probability: event.probability,
            variant_id: event.variant_id,
            quantity: event.quantity,
            establishment_id: event.establishment_id,
            created_at: event.created_at,
            updated_at: event.created_at,
            version: 0,
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
            .map_err(CinqServiceError::Repository)?;

        Ok(deal)
    }

    pub async fn update_deal(&self, cmd: UpdateDealCommand) -> CinqResult<Deal> {
        let mut deal = self
            .deal_repo
            .find_deal_by_id(&cmd.tenant_id, cmd.id)
            .await?
            .ok_or(CinqServiceError::DealNotFound)?;

        if deal.version != cmd.expected_version {
            return Err(CinqServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, deal.version
            )));
        }

        let domain_cmd = DomainUpdateDeal {
            id: cmd.id,
            tenant_id: cmd.tenant_id,
            contact_id: cmd.contact_id,
            title: cmd.title,
            pipeline_stage_id: cmd.pipeline_stage_id,
            amount: cmd.amount,
            status: cmd.status,
            owner_id: cmd.owner_id,
            probability: cmd.probability,
            variant_id: cmd.variant_id,
            quantity: cmd.quantity,
            establishment_id: cmd.establishment_id,
            expected_version: cmd.expected_version,
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
        if let Some(owner_id) = event.owner_id {
            deal.owner_id = owner_id;
        }
        if let Some(probability) = event.probability {
            deal.probability = probability;
        }
        if let Some(variant_id) = event.variant_id {
            deal.variant_id = variant_id;
        }
        if let Some(quantity) = event.quantity {
            deal.quantity = quantity;
        }
        if let Some(establishment_id) = cmd.establishment_id {
            deal.establishment_id = establishment_id;
        }
        deal.updated_at = event.updated_at;
        deal.version = event.version;
        self.deal_repo.save_deal(&deal).await?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo.append_log(deal.tenant_id, Uuid::nil(), "update_deal", "cinq", Some("deal"), Some(deal.id), None, Some(serde_json::json!({"title": deal.title, "status": format!("{:?}", deal.status)})), None, None).await.ok();
        }

        if let Some(DealStatus::Won) = event.status {
            let payload = serde_json::json!({
                "deal_id": deal.id,
                "tenant_id": deal.tenant_id.as_uuid(),
                "contact_id": deal.contact_id,
                "amount": deal.amount,
                "title": deal.title,
                "variant_id": deal.variant_id,
                "quantity": deal.quantity
            });
            self.outbox
                .append(CINQ_SCHEMA, "DealWon", deal.id, &payload)
                .await
                .map_err(CinqServiceError::Repository)?;
        }

        Ok(deal)
    }

    pub async fn delete_deal(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<()> {
        self.deal_repo.delete_deal(&tenant_id, id).await?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    tenant_id,
                    Uuid::nil(),
                    "delete_deal",
                    "cinq",
                    Some("deal"),
                    Some(id),
                    None,
                    None,
                    None,
                    None,
                )
                .await
                .ok();
        }
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
    ) -> CinqResult<(Vec<Deal>, u64)> {
        let total = self.deal_repo.count_deals(&tenant_id).await?;
        let deals = self.deal_repo.list_deals(&tenant_id, limit, offset).await?;
        Ok((deals, total))
    }

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

        let payload = serde_json::json!({
            "activity_id": activity.id,
            "tenant_id": activity.tenant_id.as_uuid(),
            "contact_id": activity.contact_id,
            "activity_type": format!("{:?}", activity.activity_type),
        });
        self.outbox
            .append(CINQ_SCHEMA, "ActivityCreated", activity.id, &payload)
            .await
            .map_err(CinqServiceError::Repository)?;

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
    ) -> CinqResult<(Vec<Activity>, u64)> {
        let total = self
            .activity_repo
            .count_activities_for_contact(&tenant_id, contact_id)
            .await?;
        let activities = self
            .activity_repo
            .list_activities_for_contact(&tenant_id, contact_id, limit, offset)
            .await?;
        Ok((activities, total))
    }

    pub async fn list_all_activities(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> CinqResult<(Vec<Activity>, u64)> {
        let total = self.activity_repo.count_all_activities(&tenant_id).await?;
        let activities = self
            .activity_repo
            .list_all_activities(&tenant_id, limit, offset)
            .await?;
        Ok((activities, total))
    }

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
            version: 0,
        };
        self.stage_repo.save_pipeline_stage(&stage).await?;

        let payload = serde_json::json!({
            "stage_id": stage.id,
            "tenant_id": stage.tenant_id.as_uuid(),
            "name": stage.name,
        });
        self.outbox
            .append(CINQ_SCHEMA, "PipelineStageCreated", stage.id, &payload)
            .await
            .map_err(CinqServiceError::Repository)?;

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
        expected_version: i32,
    ) -> CinqResult<PipelineStage> {
        let mut stage = self
            .stage_repo
            .find_pipeline_stage_by_id(&tenant_id, id)
            .await?
            .ok_or(CinqServiceError::PipelineStageNotFound)?;
        if stage.version != expected_version {
            return Err(CinqServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                expected_version, stage.version
            )));
        }
        let domain_cmd = pipeline_domain::UpdatePipelineStageCommand {
            id,
            tenant_id,
            name,
            order,
        };
        let event = pipeline_domain::update_pipeline_stage(domain_cmd, self.clock.as_ref())?;
        if let Some(n) = event.name {
            stage.name = n;
        }
        if let Some(o) = event.order {
            stage.order = o;
        }
        stage.version += 1;
        self.stage_repo.save_pipeline_stage(&stage).await?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    stage.tenant_id,
                    Uuid::nil(),
                    "update_pipeline_stage",
                    "cinq",
                    Some("pipeline_stage"),
                    Some(stage.id),
                    None,
                    Some(serde_json::json!({"name": stage.name})),
                    None,
                    None,
                )
                .await
                .ok();
        }
        Ok(stage)
    }

    pub async fn delete_pipeline_stage(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<()> {
        self.stage_repo
            .delete_pipeline_stage(&tenant_id, id)
            .await?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    tenant_id,
                    Uuid::nil(),
                    "delete_pipeline_stage",
                    "cinq",
                    Some("pipeline_stage"),
                    Some(id),
                    None,
                    None,
                    None,
                    None,
                )
                .await
                .ok();
        }
        Ok(())
    }

    pub async fn create_task(
        &self,
        cmd: ataqu_domain_cinq::task::CreateTaskCommand,
    ) -> CinqResult<ataqu_domain_cinq::task::Task> {
        let event =
            ataqu_domain_cinq::task::create_task(cmd, self.id_gen.as_ref(), self.clock.as_ref())
                .map_err(CinqServiceError::Domain)?;
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
            version: 0,
        };
        self.task_repo.save_task(&task).await?;

        let payload = serde_json::json!({
            "task_id": task.id,
            "tenant_id": task.tenant_id.as_uuid(),
            "title": task.title,
        });
        self.outbox
            .append(CINQ_SCHEMA, "TaskCreated", task.id, &payload)
            .await
            .map_err(CinqServiceError::Repository)?;

        Ok(task)
    }

    pub async fn get_task(
        &self,
        tenant_id: TenantId,
        id: Uuid,
    ) -> CinqResult<ataqu_domain_cinq::task::Task> {
        self.task_repo
            .find_task_by_id(&tenant_id, id)
            .await?
            .ok_or(CinqServiceError::TaskNotFound)
    }

    pub async fn list_tasks(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> CinqResult<Vec<ataqu_domain_cinq::task::Task>> {
        Ok(self.task_repo.list_tasks(&tenant_id, limit, offset).await?)
    }

    pub async fn list_tasks_for_contact(
        &self,
        tenant_id: TenantId,
        contact_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> CinqResult<Vec<ataqu_domain_cinq::task::Task>> {
        Ok(self
            .task_repo
            .list_tasks_for_contact(&tenant_id, contact_id, limit, offset)
            .await?)
    }

    pub async fn update_task(
        &self,
        cmd: ataqu_domain_cinq::task::UpdateTaskCommand,
    ) -> CinqResult<ataqu_domain_cinq::task::Task> {
        let mut task = self.get_task(cmd.tenant_id, cmd.id).await?;

        if task.version != cmd.expected_version {
            return Err(CinqServiceError::Validation(format!(
                "Version mismatch: expected {}, found {}",
                cmd.expected_version, task.version
            )));
        }

        let event = ataqu_domain_cinq::task::update_task(cmd.clone(), &task, self.clock.as_ref());
        if let Some(title) = event.title {
            task.title = title;
        }
        if let Some(desc) = event.description {
            task.description = Some(desc);
        }
        if let Some(due) = event.due_date {
            task.due_date = Some(due);
        }
        if let Some(status) = event.status {
            task.status = status;
        }
        task.updated_at = event.updated_at;
        task.version = event.version;
        self.task_repo.save_task(&task).await?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo.append_log(task.tenant_id, Uuid::nil(), "update_task", "cinq", Some("task"), Some(task.id), None, Some(serde_json::json!({"title": task.title, "status": format!("{:?}", task.status)})), None, None).await.ok();
        }
        Ok(task)
    }

    pub async fn delete_task(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<()> {
        self.task_repo.delete_task(&tenant_id, id).await?;
        if let Some(audit_repo) = &self.audit_repo {
            audit_repo
                .append_log(
                    tenant_id,
                    Uuid::nil(),
                    "delete_task",
                    "cinq",
                    Some("task"),
                    Some(id),
                    None,
                    None,
                    None,
                    None,
                )
                .await
                .ok();
        }
        Ok(())
    }

    pub async fn create_establishment(
        &self,
        cmd: CreateEstablishmentCommand,
    ) -> CinqResult<ataqu_domain_cinq::establishment::Establishment> {
        use ataqu_domain_cinq::establishment::{
            CreateEstablishmentCommand as DomainCreate, create_establishment as domain_create,
        };
        let domain_cmd = DomainCreate {
            tenant_id: cmd.tenant_id,
            company_name: cmd.company_name,
            siret: cmd.siret,
            address: cmd.address,
        };
        let event = domain_create(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())?;
        let est = ataqu_domain_cinq::establishment::Establishment {
            id: event.id,
            tenant_id: event.tenant_id,
            company_name: event.company_name,
            siret: event.siret,
            address: event.address,
            created_at: event.created_at,
            updated_at: event.created_at,
        };
        self.establishment_repo.save_establishment(&est).await?;

        let payload = serde_json::json!({
            "establishment_id": est.id,
            "tenant_id": est.tenant_id.as_uuid(),
            "company_name": est.company_name,
        });
        self.outbox
            .append(CINQ_SCHEMA, "EstablishmentCreated", est.id, &payload)
            .await
            .map_err(CinqServiceError::Repository)?;

        Ok(est)
    }

    pub async fn list_establishments(
        &self,
        tenant_id: TenantId,
        limit: u64,
        offset: u64,
    ) -> CinqResult<Vec<ataqu_domain_cinq::establishment::Establishment>> {
        Ok(self
            .establishment_repo
            .list_establishments(&tenant_id, limit, offset)
            .await?)
    }

    pub async fn get_establishment(
        &self,
        tenant_id: TenantId,
        id: Uuid,
    ) -> CinqResult<ataqu_domain_cinq::establishment::Establishment> {
        self.establishment_repo
            .find_establishment_by_id(&tenant_id, id)
            .await?
            .ok_or_else(|| {
                CinqServiceError::EstablishmentNotFound("Establishment not found".to_string())
            })
    }




    pub async fn get_tracking_events_for_contact(
        &self,
        tenant_id: TenantId,
        contact_id: Uuid,
        limit: u64,
        offset: u64,
    ) -> CinqResult<(Vec<ataqu_infra_repositories::email_tracking_writer::TrackingEvent>, u64)> {
        use ataqu_infra_repositories::email_tracking_repo::EmailTrackingRepository;
        let repo = EmailTrackingRepository::new(self.db.clone());
        let events = repo.get_tracking_events_for_contact(&tenant_id, contact_id, limit, offset)
            .await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))?;
        // Total count - we need a separate count query; for now we return events len as total (approximate)
        // We should implement count in repo, but for now use a simple workaround.
        let total = events.len() as u64; // not accurate, but better than nothing
        Ok((events, total))
    }

    /// Export contacts as a stream of CSV chunks (one chunk per page), avoiding OOM for large datasets.
    pub async fn export_contacts_stream(
        &self,
        tenant_id: TenantId,
    ) -> CinqResult<futures::stream::BoxStream<'static, Result<Vec<u8>, std::io::Error>>> {
        use futures::stream::{self};
        use tokio::sync::mpsc;

        let (tx, rx) = mpsc::channel(10);
        let repo = self.contact_repo.clone();

        tokio::spawn(async move {
            let page_size = 1000u64;
            let mut offset = 0u64;
            let mut is_first = true;

            loop {
                let contacts = match repo.list_contacts(&tenant_id, page_size, offset).await {
                    Ok(c) => c,
                    Err(e) => {
                        let _ = tx.send(Err(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))).await;
                        break;
                    }
                };
                if contacts.is_empty() {
                    break;
                }

                // Build CSV for this page
                let mut wtr = csv::WriterBuilder::new()
                    .has_headers(is_first)
                    .from_writer(Vec::new());
                for c in contacts {
                    let record = vec![
                        c.id.to_string(),
                        c.name.clone(),
                        c.email.reveal(&ataqu_security::PiiAccessKey::new()).to_string(),
                        c.phone.as_ref().map(|p| p.reveal(&ataqu_security::PiiAccessKey::new()).to_string()).unwrap_or_default(),
                        c.created_at.to_rfc3339(),
                    ];
                    if let Err(e) = wtr.write_record(&record) {
                        let _ = tx.send(Err(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))).await;
                        break;
                    }
                }
                let data = wtr.into_inner().unwrap_or_default();
                if !data.is_empty() {
                    if let Err(_e) = tx.send(Ok(data)).await {
                        break;
                    }
                }

                is_first = false;
                offset += page_size;
            }
        });

        let stream = stream::unfold(rx, |mut rx| async {
            rx.recv().await.map(|item| (item, rx))
        });
        Ok(Box::pin(stream) as futures::stream::BoxStream<'static, Result<Vec<u8>, std::io::Error>>)
    }

    pub async fn bulk_delete_deals(&self, tenant_id: TenantId, ids: Vec<Uuid>) -> CinqResult<()> {
        for id in ids {
            self.deal_repo.delete_deal(&tenant_id, id).await?;
        }
        Ok(())
    }
}
