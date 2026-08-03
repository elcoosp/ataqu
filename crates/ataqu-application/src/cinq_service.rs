//! CINQ CRM orchestration service – using domain pure functions and entities.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_security::{Email, PhoneNumber};
use ataqu_domain_cinq::contact::{self as contact_domain, Contact, CreateContactCommand as DomainCreateContact};
use ataqu_domain_cinq::deal::{self as deal_domain, Deal, CreateDealCommand as DomainCreateDeal, DealStatus};
use ataqu_domain_cinq::error::CinqDomainError;

// Application-level commands using domain types.
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

#[derive(Debug, thiserror::Error)]
pub enum CinqServiceError {
    #[error("Contact not found")]
    ContactNotFound,
    #[error("Deal not found")]
    DealNotFound,
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Domain error: {0}")]
    Domain(#[from] CinqDomainError),
}

pub type CinqResult<T> = Result<T, CinqServiceError>;

#[derive(Default)]
struct ContactStore {
    contacts: Arc<RwLock<HashMap<Uuid, Contact>>>,
}

#[derive(Default)]
struct DealStore {
    deals: Arc<RwLock<HashMap<Uuid, Deal>>>,
}

pub struct CinqService {
    contacts: ContactStore,
    deals: DealStore,
    id_gen: Arc<dyn IdGenerator>,
    clock: Arc<dyn Clock>,
}

impl CinqService {
    pub fn new(id_gen: Arc<dyn IdGenerator>, clock: Arc<dyn Clock>) -> Self {
        Self {
            contacts: ContactStore::default(),
            deals: DealStore::default(),
            id_gen,
            clock,
        }
    }

    pub async fn create_contact(&self, cmd: CreateContactCommand) -> CinqResult<Contact> {
        if cmd.name.trim().is_empty() {
            return Err(CinqServiceError::Validation("Name cannot be empty".into()));
        }

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

        self.contacts.contacts.write().unwrap().insert(contact.id, contact.clone());
        Ok(contact)
    }

    pub async fn get_contact(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<Contact> {
        let map = self.contacts.contacts.read().unwrap();
        map.get(&id)
            .filter(|c| c.tenant_id == tenant_id)
            .cloned()
            .ok_or(CinqServiceError::ContactNotFound)
    }

    pub async fn list_contacts(&self, tenant_id: TenantId) -> CinqResult<Vec<Contact>> {
        let map = self.contacts.contacts.read().unwrap();
        let contacts = map.values().filter(|c| c.tenant_id == tenant_id).cloned().collect();
        Ok(contacts)
    }

    pub async fn create_deal(&self, cmd: CreateDealCommand) -> CinqResult<Deal> {
        // Validate contact exists
        let _ = self.get_contact(cmd.tenant_id, cmd.contact_id).await?;

        if cmd.amount <= 0.0 {
            return Err(CinqServiceError::Validation("Amount must be positive".into()));
        }
        if cmd.title.trim().is_empty() {
            return Err(CinqServiceError::Validation("Deal title cannot be empty".into()));
        }

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

        self.deals.deals.write().unwrap().insert(deal.id, deal.clone());
        Ok(deal)
    }

    pub async fn get_deal(&self, tenant_id: TenantId, id: Uuid) -> CinqResult<Deal> {
        let map = self.deals.deals.read().unwrap();
        map.get(&id)
            .filter(|d| d.tenant_id == tenant_id)
            .cloned()
            .ok_or(CinqServiceError::DealNotFound)
    }

    pub async fn list_deals(&self, tenant_id: TenantId) -> CinqResult<Vec<Deal>> {
        let map = self.deals.deals.read().unwrap();
        let deals = map.values().filter(|d| d.tenant_id == tenant_id).cloned().collect();
        Ok(deals)
    }

    pub async fn search_contacts(&self, tenant_id: TenantId, query: &str) -> CinqResult<Vec<Contact>> {
        let map = self.contacts.contacts.read().unwrap();
        let query_lower = query.to_lowercase();
        let results = map.values()
            .filter(|c| c.tenant_id == tenant_id)
            .filter(|c| c.name.to_lowercase().contains(&query_lower) || c.email.as_ref().to_lowercase().contains(&query_lower))
            .cloned()
            .collect();
        Ok(results)
    }
}
