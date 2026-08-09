use crate::error::CinqResult;
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct Establishment {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub company_name: String,
    pub siret: Option<String>,
    pub address: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateEstablishmentCommand {
    pub tenant_id: TenantId,
    pub company_name: String,
    pub siret: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Clone)]
pub struct EstablishmentCreated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub company_name: String,
    pub siret: Option<String>,
    pub address: Option<String>,
    pub created_at: DateTime<Utc>,
}

pub fn create_establishment(
    cmd: CreateEstablishmentCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> CinqResult<EstablishmentCreated> {
    if cmd.company_name.trim().is_empty() {
        return Err(crate::error::CinqDomainError::Validation(
            "Company name cannot be empty".to_string(),
        ));
    }
    let id = id_gen.new_uuid_v7();
    let now = clock.now().into();
    Ok(EstablishmentCreated {
        id,
        tenant_id: cmd.tenant_id,
        company_name: cmd.company_name,
        siret: cmd.siret,
        address: cmd.address,
        created_at: now,
    })
}

impl ataqu_kernel::Identifiable for Establishment {
    fn id(&self) -> Uuid {
        self.id
    }
}
