//! CINQ CRM orchestration service – in-memory implementation.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

use ataqu_kernel::{Clock, IdGenerator, TenantId};

// Domain DTOs
#[derive(Debug, Clone)]
pub struct Contact {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct Deal {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub title: String,
    pub amount: f64,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateContactCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
}

#[derive(Debug, Clone)]
pub struct CreateDealCommand {
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub title: String,
    pub amount: f64,
    pub status: String,
}

#[derive(Debug, thiserror::Error)]
pub enum CinqServiceError {
    #[error("Contact not found")]
    ContactNotFound,
    #[error("Deal not found")]
    DealNotFound,
    #[error("Validation error: {0}")]
    Validation(String),
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
        if !cmd.email.contains('@') {
            return Err(CinqServiceError::Validation("Invalid email".into()));
        }
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let contact = Contact {
            id,
            tenant_id: cmd.tenant_id,
            name: cmd.name,
            email: cmd.email,
            phone: cmd.phone,
            created_at: now,
        };
        self.contacts.contacts.write().unwrap().insert(id, contact.clone());
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
        if cmd.title.trim().is_empty() {
            return Err(CinqServiceError::Validation("Deal title cannot be empty".into()));
        }
        let id = self.id_gen.new_uuid_v7();
        let now = self.clock.now().into();
        let deal = Deal {
            id,
            tenant_id: cmd.tenant_id,
            contact_id: cmd.contact_id,
            title: cmd.title,
            amount: cmd.amount,
            status: cmd.status,
            created_at: now,
        };
        self.deals.deals.write().unwrap().insert(id, deal.clone());
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
}
