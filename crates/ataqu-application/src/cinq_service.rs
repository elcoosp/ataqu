//! CINQ CRM orchestration service – uses domain repositories and outbox.
use std::sync::Arc;
use uuid::Uuid;
use std::collections::HashMap;

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_security::{Email, PhoneNumber};
use ataqu_domain_cinq::contact::{self as contact_domain, Contact, CreateContactCommand as DomainCreateContact};
use ataqu_domain_cinq::deal::{self as deal_domain, Deal, CreateDealCommand as DomainCreateDeal, DealStatus};
use ataqu_domain_cinq::activity::{self as activity_domain, Activity, CreateActivityCommand as DomainCreateActivity, ActivityType};
use ataqu_domain_cinq::pipeline::{self as pipeline_domain, PipelineStage, CreatePipelineStageCommand as DomainCreateStage};
use ataqu_domain_cinq::error::CinqDomainError;
use ataqu_domain_cinq::repository::{ContactRepository, DealRepository, ActivityRepository, PipelineStageRepository};

// Application commands (converted to domain commands later)
#[derive(Debug, Clone)]
pub struct CreateContactCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub email: Email,
    pub phone: Option<PhoneNumber>,
}

#[derive(Debug, Clone)]
pub struct CreateDealCommand {
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub title: String,
    pub pipeline_stage_id: Uuid,
    pub amount: f64,
    pub status: DealStatus,
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
    stage_repo: Arc<dyn PipelineStageRepository + Send + Sync>,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl CinqService {
    pub fn new(
        contact_repo: Arc<dyn ContactRepository + Send + Sync>,
        deal_repo: Arc<dyn DealRepository + Send + Sync>,
        activity_repo: Arc<dyn ActivityRepository + Send + Sync>,
        stage_repo: Arc<dyn PipelineStageRepository + Send + Sync>,
        id_gen: Arc<dyn IdGenerator>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            contact_repo,
            deal_repo,
            activity_repo,
            stage_repo,
            id_gen,
            clock,
        }
    }

    // ---------- Contacts ----------
    pub async fn create_contact(&self, cmd: CreateContactCommand) -> CinqResult<Contact> {
        let domain_cmd = DomainCreateContact {
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            email: cmd.email,
            phone: cmd.phone,
        };
        let event = contact_domain::create_contact(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
        let contact = Contact {
            id: event.id,
            tenant_id: event.tenant_id,
            name: event.name,
            email: event.email,
            phone: event.phone,
            created_at: event.created_at,
            updated_at: event.created_at,
        };
        self.contact_repo.save_contact(&contact).await.map_err(|e| CinqServiceError::Repository(e.to_string()))?;
        Ok(contact)
    }

    pub async fn get_contact(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<Contact> {
        self.contact_repo.find_contact_by_id(&tenant_id, id).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))?
            .ok_or(CinqServiceError::ContactNotFound)
    }

    pub async fn list_contacts(&self, tenant_id: TenantId, limit: u64, offset: u64) -> CinqResult<Vec<Contact>> {
        self.contact_repo.list_contacts(&tenant_id, limit, offset).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))
    }

    pub async fn search_contacts(&self, tenant_id: TenantId, query: &str, limit: u64) -> CinqResult<Vec<Contact>> {
        self.contact_repo.search_contacts(&tenant_id, query, limit).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))
    }

    pub async fn import_contacts(&self, _tenant_id: TenantId, rows: Vec<HashMap<String, String>>) -> CinqResult<Vec<Uuid>> {
        use ataqu_domain_cinq::csv_validation::validate_contact_row;
        let mut inserted = Vec::new();
        for row in rows {
            let values: Vec<String> = row.values().cloned().collect();
            let cmd = validate_contact_row(&values)?;
            let domain_cmd = DomainCreateContact {
                tenant_id: cmd.tenant_id,
                name: cmd.name,
                email: cmd.email,
                phone: cmd.phone,
            };
            let event = contact_domain::create_contact(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
            let contact = Contact {
                id: event.id,
                tenant_id: event.tenant_id,
                name: event.name,
                email: event.email,
                phone: event.phone,
                created_at: event.created_at,
                updated_at: event.created_at,
            };
            self.contact_repo.save_contact(&contact).await?;
            inserted.push(contact.id);
        }
        Ok(inserted)
    }

    pub async fn export_contacts(&self, tenant_id: TenantId) -> CinqResult<String> {
        use csv::Writer;
        let contacts = self.contact_repo.list_contacts(&tenant_id, 10000, 0).await?;
        let mut wtr = Writer::from_writer(vec![]);
        // Write header
        wtr.write_record(&["id", "name", "email", "phone", "created_at"])
            .map_err(|e| CinqServiceError::Validation(e.to_string()))?;
        for c in contacts {
            wtr.write_record(&[
                c.id.to_string(),
                c.name.clone(),
                c.email.as_ref().to_string(),
                c.phone.as_ref().map(|p| p.as_ref().to_string()).unwrap_or_default(),
                c.created_at.to_rfc3339(),
            ]).map_err(|e| CinqServiceError::Validation(e.to_string()))?;
        }
        let data = String::from_utf8(wtr.into_inner().map_err(|e| CinqServiceError::Validation(e.to_string()))?)
            .map_err(|e| CinqServiceError::Validation(e.to_string()))?;
        Ok(data)
    }

    // ---------- Deals ----------
    pub async fn create_deal(&self, cmd: CreateDealCommand) -> CinqResult<Deal> {
        // Validate contact exists
        let _ = self.get_contact(cmd.tenant_id, cmd.contact_id).await?;
        let domain_cmd = DomainCreateDeal {
            tenant_id: cmd.tenant_id,
            contact_id: cmd.contact_id,
            title: cmd.title.clone(),
            pipeline_stage_id: cmd.pipeline_stage_id,
            amount: cmd.amount,
            status: cmd.status,
        };
        let event = deal_domain::create_deal(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(CinqServiceError::Domain)?;
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
        self.deal_repo.save_deal(&deal).await.map_err(|e| CinqServiceError::Repository(e.to_string()))?;
        Ok(deal)
    }

    pub async fn get_deal(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<Deal> {
        self.deal_repo.find_deal_by_id(&tenant_id, id).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))?
            .ok_or(CinqServiceError::DealNotFound)
    }

    pub async fn list_deals(&self, tenant_id: TenantId, limit: u64, offset: u64) -> CinqResult<Vec<Deal>> {
        self.deal_repo.list_deals(&tenant_id, limit, offset).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))
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
        let event = activity_domain::create_activity(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref());
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
        self.activity_repo.save_activity(&activity).await.map_err(|e| CinqServiceError::Repository(e.to_string()))?;
        Ok(activity)
    }

    pub async fn get_activity(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<Activity> {
        self.activity_repo.find_activity_by_id(&tenant_id, id).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))?
            .ok_or(CinqServiceError::ActivityNotFound)
    }

    pub async fn list_activities_for_contact(&self, tenant_id: TenantId, contact_id: Uuid, limit: u64, offset: u64) -> CinqResult<Vec<Activity>> {
        self.activity_repo.list_activities_for_contact(&tenant_id, contact_id, limit, offset).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))
    }

    // ---------- Pipeline Stages ----------
    pub async fn create_pipeline_stage(&self, cmd: CreatePipelineStageCommand) -> CinqResult<PipelineStage> {
        let domain_cmd = DomainCreateStage {
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            order: cmd.order,
        };
        let event = pipeline_domain::create_pipeline_stage(domain_cmd, self.id_gen.as_ref(), self.clock.as_ref())
            .map_err(CinqServiceError::Domain)?;
        let stage = PipelineStage {
            id: event.id,
            tenant_id: event.tenant_id,
            name: event.name,
            order: event.order,
            created_at: event.created_at,
            updated_at: event.created_at,
        };
        self.stage_repo.save_pipeline_stage(&stage).await.map_err(|e| CinqServiceError::Repository(e.to_string()))?;
        Ok(stage)
    }

    pub async fn list_pipeline_stages(&self, tenant_id: TenantId) -> CinqResult<Vec<PipelineStage>> {
        self.stage_repo.list_pipeline_stages(&tenant_id).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))
    }

    pub async fn get_pipeline_stage(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<PipelineStage> {
        self.stage_repo.find_pipeline_stage_by_id(&tenant_id, id).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))?
            .ok_or(CinqServiceError::PipelineStageNotFound)
    }

    pub async fn update_pipeline_stage(&self, tenant_id: TenantId, id: Uuid, name: Option<String>, order: Option<i32>) -> CinqResult<PipelineStage> {
        // Fetch the existing stage
        let mut stage = self.stage_repo.find_pipeline_stage_by_id(&tenant_id, id).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))?
            .ok_or(CinqServiceError::PipelineStageNotFound)?;
        // Update fields
        if let Some(name) = name {
            stage.name = name;
        }
        if let Some(order) = order {
            stage.order = order;
        }
        // Save back
        self.stage_repo.save_pipeline_stage(&stage).await
            .map_err(|e| CinqServiceError::Repository(e.to_string()))?;
        Ok(stage)
    }

    pub async fn delete_pipeline_stage(&self, _tenant_id: TenantId, _id: Uuid) -> CinqResult<()> {
        // We don't have a delete method in the repo trait; we'll implement it.
        // We'll add a method to the trait and implement it in the repository.
        // For now, we'll just return an error saying not implemented.
        Err(CinqServiceError::Validation("Delete not implemented".to_string()))
    }

}
