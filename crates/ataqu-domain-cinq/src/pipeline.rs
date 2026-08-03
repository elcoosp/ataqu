use crate::error::{CinqDomainError, CinqResult};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::{DateTime, Utc};
use uuid::Uuid;
#[derive(Debug, Clone, PartialEq)]
pub struct PipelineStage {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
#[derive(Debug, Clone)]
pub struct CreatePipelineStageCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub order: i32,
}
#[derive(Debug, Clone)]
pub struct UpdatePipelineStageCommand {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: Option<String>,
    pub order: Option<i32>,
}
#[derive(Debug, Clone)]
pub struct PipelineStageCreated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub order: i32,
    pub created_at: DateTime<Utc>,
}
#[derive(Debug, Clone)]
pub struct PipelineStageUpdated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: Option<String>,
    pub order: Option<i32>,
    pub updated_at: DateTime<Utc>,
}
pub fn create_pipeline_stage(
    cmd: CreatePipelineStageCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> CinqResult<PipelineStageCreated> {
    if cmd.order < 0 {
        return Err(CinqDomainError::InvalidOrder);
    }
    if cmd.name.trim().is_empty() {
        return Err(CinqDomainError::Validation(
            "Stage name cannot be empty".to_string(),
        ));
    }
    let id = id_gen.new_uuid_v7();
    let now = clock.now().into();
    Ok(PipelineStageCreated {
        id,
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        order: cmd.order,
        created_at: now,
    })
}
pub fn update_pipeline_stage(
    cmd: UpdatePipelineStageCommand,
    clock: &dyn Clock,
) -> CinqResult<PipelineStageUpdated> {
    if let Some(order) = cmd.order
        && order < 0
    {
        return Err(CinqDomainError::InvalidOrder);
    }
    if let Some(ref name) = cmd.name
        && name.trim().is_empty()
    {
        return Err(CinqDomainError::Validation(
            "Stage name cannot be empty".to_string(),
        ));
    }
    let now = clock.now().into();
    Ok(PipelineStageUpdated {
        id: cmd.id,
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        order: cmd.order,
        updated_at: now,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_kernel::{Clock, IdGenerator};
    use chrono::{DateTime, Utc};
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
    fn create_stage_validates_order_and_name() {
        let cmd = CreatePipelineStageCommand {
            tenant_id: TenantId::new(Uuid::new_v4()),
            name: "Qualification".to_string(),
            order: 1,
        };
        let id_gen = MockIdGenerator::new();
        let clock = MockClock::new(Utc::now());
        let result = create_pipeline_stage(cmd, &id_gen, &clock);
        assert!(result.is_ok());
    }
    #[test]
    fn create_stage_rejects_negative_order() {
        let cmd = CreatePipelineStageCommand {
            tenant_id: TenantId::new(Uuid::new_v4()),
            name: "Qualification".to_string(),
            order: -1,
        };
        let id_gen = MockIdGenerator::new();
        let clock = MockClock::new(Utc::now());
        let result = create_pipeline_stage(cmd, &id_gen, &clock);
        assert!(matches!(result, Err(CinqDomainError::InvalidOrder)));
    }
}
