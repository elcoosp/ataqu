use crate::error::{CinqDomainError, CinqResult};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DealStatus {
    Open,
    Won,
    Lost,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Deal {
    pub id: Uuid,
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
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
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
pub struct DealCreated {
    pub id: Uuid,
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
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct DealUpdated {
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
    pub updated_at: DateTime<Utc>,
    pub version: i32,
}

pub fn create_deal(
    cmd: CreateDealCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> CinqResult<DealCreated> {
    if cmd.amount < Decimal::ZERO {
        return Err(CinqDomainError::InvalidAmount);
    }
    if cmd.title.trim().is_empty() {
        return Err(CinqDomainError::Validation(
            "Deal title cannot be empty".to_string(),
        ));
    }
    let id = id_gen.new_uuid_v7();
    let now = clock.now().into();
    Ok(DealCreated {
        id,
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
        created_at: now,
    })
}

pub fn update_deal(cmd: UpdateDealCommand, clock: &dyn Clock) -> CinqResult<DealUpdated> {
    if let Some(amount) = cmd.amount
        && amount < Decimal::ZERO
    {
        return Err(CinqDomainError::InvalidAmount);
    }
    if let Some(ref title) = cmd.title
        && title.trim().is_empty()
    {
        return Err(CinqDomainError::Validation(
            "Deal title cannot be empty".to_string(),
        ));
    }
    let now = clock.now().into();
    Ok(DealUpdated {
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
        updated_at: now,
        version: cmd.expected_version + 1,
    })
}

impl ataqu_kernel::Identifiable for Deal {
    fn id(&self) -> uuid::Uuid {
        self.id
    }
}
