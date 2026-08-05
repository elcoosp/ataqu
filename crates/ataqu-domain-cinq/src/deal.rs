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
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
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
pub struct DealCreated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub title: String,
    pub pipeline_stage_id: Uuid,
    pub amount: Decimal,
    pub status: DealStatus,
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
    pub updated_at: DateTime<Utc>,
}

pub fn create_deal(
    cmd: CreateDealCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> CinqResult<DealCreated> {
    if cmd.amount <= Decimal::ZERO {
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
        created_at: now,
    })
}

pub fn update_deal(cmd: UpdateDealCommand, clock: &dyn Clock) -> CinqResult<DealUpdated> {
    if let Some(amount) = cmd.amount
        && amount <= Decimal::ZERO
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
        updated_at: now,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_kernel::{Clock, IdGenerator};
    use chrono::{DateTime, Utc};
    use rust_decimal::Decimal;

    struct MockIdGenerator {
        next: Uuid,
    }
    impl MockIdGenerator {
        fn new() -> Self {
            Self {
                next: Uuid::new_v4(),
            }
        }
    }
    impl IdGenerator for MockIdGenerator {
        fn new_uuid_v7(&self) -> Uuid {
            self.next
        }
    }

    struct MockClock {
        now: DateTime<Utc>,
    }
    impl MockClock {
        fn new(now: DateTime<Utc>) -> Self {
            Self { now }
        }
    }
    impl Clock for MockClock {
        fn now(&self) -> std::time::SystemTime {
            self.now.into()
        }
    }

    #[test]
    fn create_deal_validates_amount_and_title() {
        let cmd = CreateDealCommand {
            tenant_id: TenantId::new(Uuid::new_v4()),
            contact_id: Uuid::new_v4(),
            title: "My Deal".to_string(),
            pipeline_stage_id: Uuid::new_v4(),
            amount: Decimal::new(100, 0),
            status: DealStatus::Open,
        };
        let id_gen = MockIdGenerator::new();
        let clock = MockClock::new(Utc::now());
        let result = create_deal(cmd, &id_gen, &clock);
        assert!(result.is_ok());
    }

    #[test]
    fn create_deal_rejects_negative_amount() {
        let cmd = CreateDealCommand {
            tenant_id: TenantId::new(Uuid::new_v4()),
            contact_id: Uuid::new_v4(),
            title: "My Deal".to_string(),
            pipeline_stage_id: Uuid::new_v4(),
            amount: Decimal::new(-10, 0),
            status: DealStatus::Open,
        };
        let id_gen = MockIdGenerator::new();
        let clock = MockClock::new(Utc::now());
        let result = create_deal(cmd, &id_gen, &clock);
        assert!(matches!(result, Err(CinqDomainError::InvalidAmount)));
    }
}

impl ataqu_kernel::Identifiable for Deal {
    fn id(&self) -> uuid::Uuid { self.id }
}
