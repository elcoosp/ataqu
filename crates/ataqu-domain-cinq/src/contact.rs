use ataqu_kernel::{Clock, IdGenerator, TenantId};

use chrono::{DateTime, Utc};

use ataqu_security::{Email, PhoneNumber};
use uuid::Uuid;

use crate::error::{CinqDomainError, CinqResult};

// ---------- Domain Entity ----------
#[derive(Debug, Clone, PartialEq)]
pub struct Contact {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub email: Email,
    pub phone: Option<PhoneNumber>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ---------- Commands ----------
#[derive(Debug, Clone)]
pub struct CreateContactCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub email: Email,
    pub phone: Option<PhoneNumber>,
}

#[derive(Debug, Clone)]
pub struct UpdateContactCommand {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: Option<String>,
    pub email: Option<Email>,
    pub phone: Option<Option<PhoneNumber>>, // None = no change, Some(None) = clear
}

// ---------- Events ----------
#[derive(Debug, Clone)]
pub struct ContactCreated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub email: Email,
    pub phone: Option<PhoneNumber>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ContactUpdated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: Option<String>,
    pub email: Option<Email>,
    pub phone: Option<Option<PhoneNumber>>,
    pub updated_at: DateTime<Utc>,
}

// ---------- Pure Domain Functions ----------
pub fn create_contact(
    cmd: CreateContactCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> ContactCreated {
    let id = id_gen.new_uuid_v7();
    let now = clock.now().into(); // Convert SystemTime to DateTime<Utc>
    ContactCreated {
        id,
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        email: cmd.email,
        phone: cmd.phone,
        created_at: now,
    }
}

pub fn update_contact(cmd: UpdateContactCommand, clock: &dyn Clock) -> ContactUpdated {
    let now = clock.now().into();
    ContactUpdated {
        id: cmd.id,
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        email: cmd.email,
        phone: cmd.phone,
        updated_at: now,
    }
}

// ---------- Validation (pure) ----------
pub fn validate_contact_name(name: &str) -> CinqResult<()> {
    if name.trim().is_empty() {
        return Err(CinqDomainError::Validation(
            "Name cannot be empty".to_string(),
        ));
    }
    Ok(())
}

pub fn validate_contact_email(_email: &Email) -> CinqResult<()> {
    // Email newtype already validates on construction? We assume it's valid.
    // Additional domain-specific rules can go here.
    Ok(())
}

pub fn validate_contact_phone(_phone: &Option<PhoneNumber>) -> CinqResult<()> {
    // Assume Phone newtype is valid.
    Ok(())
}

// ---------- Tests ----------

#[cfg(test)]
mod tests {
    use super::*;
    use ataqu_kernel::{Clock, IdGenerator};
    use chrono::{DateTime, TimeZone, Utc};

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
    fn create_contact_should_generate_id_and_timestamp() {
        let cmd = CreateContactCommand {
            tenant_id: TenantId::new(Uuid::new_v4()),
            name: "Alice".to_string(),
            email: Email::new("alice@example.com".to_string()),
            phone: None,
        };
        let mut id_gen = MockIdGenerator::new();
        let fixed_id = Uuid::new_v4();
        id_gen.set_next_uuid(fixed_id);
        let clock = MockClock::new(Utc.with_ymd_and_hms(2026, 8, 1, 12, 0, 0).unwrap());

        let event = create_contact(cmd.clone(), &id_gen, &clock);

        assert_eq!(event.id, fixed_id);
        assert_eq!(event.tenant_id, cmd.tenant_id);
        assert_eq!(event.name, cmd.name);
        assert_eq!(event.email, cmd.email);
        assert_eq!(event.phone, cmd.phone);
        let created_at: DateTime<Utc> = clock.now().into();
        assert_eq!(event.created_at, created_at);
    }

    #[test]
    fn update_contact_should_set_updated_at() {
        let cmd = UpdateContactCommand {
            id: Uuid::new_v4(),
            tenant_id: TenantId::new(Uuid::new_v4()),
            name: Some("Bob".to_string()),
            email: None,
            phone: Some(Some(PhoneNumber::new("+1234567890".to_string()))),
        };
        let clock = MockClock::new(Utc.with_ymd_and_hms(2026, 8, 1, 13, 0, 0).unwrap());

        let event = update_contact(cmd.clone(), &clock);

        assert_eq!(event.id, cmd.id);
        assert_eq!(event.tenant_id, cmd.tenant_id);
        assert_eq!(event.name, cmd.name);
        assert_eq!(event.email, cmd.email);
        assert_eq!(event.phone, cmd.phone);
        let updated_at: DateTime<Utc> = clock.now().into();
        assert_eq!(event.updated_at, updated_at);
    }

    #[test]
    fn validate_contact_name_rejects_empty() {
        let result = validate_contact_name("");
        assert!(result.is_err());
        let result = validate_contact_name("   ");
        assert!(result.is_err());
        let result = validate_contact_name("John");
        assert!(result.is_ok());
    }
}
