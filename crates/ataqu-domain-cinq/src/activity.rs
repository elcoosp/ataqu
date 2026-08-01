use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::{DateTime, Utc};

use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActivityType {
    Call,
    Email,
    Meeting,
    Task,
    Note,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Activity {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub deal_id: Option<Uuid>,
    pub activity_type: ActivityType,
    pub description: String,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CreateActivityCommand {
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub deal_id: Option<Uuid>,
    pub activity_type: ActivityType,
    pub description: String,
    pub scheduled_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub struct UpdateActivityCommand {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub contact_id: Option<Uuid>,
    pub deal_id: Option<Option<Uuid>>,
    pub activity_type: Option<ActivityType>,
    pub description: Option<String>,
    pub scheduled_at: Option<Option<DateTime<Utc>>>,
}

#[derive(Debug, Clone)]
pub struct ActivityCreated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub contact_id: Uuid,
    pub deal_id: Option<Uuid>,
    pub activity_type: ActivityType,
    pub description: String,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ActivityUpdated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub contact_id: Option<Uuid>,
    pub deal_id: Option<Option<Uuid>>,
    pub activity_type: Option<ActivityType>,
    pub description: Option<String>,
    pub scheduled_at: Option<Option<DateTime<Utc>>>,
    pub updated_at: DateTime<Utc>,
}

pub fn create_activity(
    cmd: CreateActivityCommand,
    id_gen: &impl IdGenerator,
    clock: &impl Clock,
) -> ActivityCreated {
    let id = id_gen.new_uuid_v7();
    let now = clock.now().into();
    ActivityCreated {
        id,
        tenant_id: cmd.tenant_id,
        contact_id: cmd.contact_id,
        deal_id: cmd.deal_id,
        activity_type: cmd.activity_type,
        description: cmd.description,
        scheduled_at: cmd.scheduled_at,
        created_at: now,
    }
}

pub fn update_activity(cmd: UpdateActivityCommand, clock: &impl Clock) -> ActivityUpdated {
    let now = clock.now().into();
    ActivityUpdated {
        id: cmd.id,
        tenant_id: cmd.tenant_id,
        contact_id: cmd.contact_id,
        deal_id: cmd.deal_id,
        activity_type: cmd.activity_type,
        description: cmd.description,
        scheduled_at: cmd.scheduled_at,
        updated_at: now,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_kernel::{Clock, IdGenerator};
    use chrono::TimeZone;
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
        fn set_next_uuid(&mut self, id: Uuid) {
            self.next = id;
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
    fn create_activity_sets_id_and_timestamp() {
        let cmd = CreateActivityCommand {
            tenant_id: TenantId::new(Uuid::new_v4()),
            contact_id: Uuid::new_v4(),
            deal_id: None,
            activity_type: ActivityType::Call,
            description: "Follow-up call".to_string(),
            scheduled_at: None,
        };
        let mut id_gen = MockIdGenerator::new();
        let id = Uuid::new_v4();
        id_gen.set_next_uuid(id);
        let clock = MockClock::new(Utc.with_ymd_and_hms(2026, 8, 1, 14, 0, 0).unwrap());

        let event = create_activity(cmd.clone(), &id_gen, &clock);

        assert_eq!(event.id, id);
        assert_eq!(event.tenant_id, cmd.tenant_id);
        assert_eq!(event.contact_id, cmd.contact_id);
        assert_eq!(event.deal_id, cmd.deal_id);
        assert_eq!(event.activity_type, cmd.activity_type);
        assert_eq!(event.description, cmd.description);
        assert_eq!(event.scheduled_at, cmd.scheduled_at);
        let created_at: DateTime<Utc> = clock.now().into();
        assert_eq!(event.created_at, created_at);
    }
}
