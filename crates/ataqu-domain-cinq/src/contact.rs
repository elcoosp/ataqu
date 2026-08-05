use ataqu_kernel::{Clock, IdGenerator, TenantId};
use ataqu_security::{Email, PhoneNumber};
use chrono::{DateTime, Utc};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::error::{CinqDomainError, CinqResult};

// ---------- Domain Entity ----------
#[derive(Debug, Clone, PartialEq)]
pub struct Contact {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub company: Option<String>,
    pub email: Email,
    pub phone: Option<PhoneNumber>,
    pub custom_fields: JsonValue,
    pub lead_score: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
}

// ---------- Commands ----------
#[derive(Debug, Clone)]
pub struct CreateContactCommand {
    pub tenant_id: TenantId,
    pub name: String,
    pub company: Option<String>,
    pub email: Email,
    pub phone: Option<PhoneNumber>,
    pub custom_fields: JsonValue,
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
    pub custom_fields: Option<JsonValue>,
    pub lead_score: Option<i32>,
    pub expected_version: i32,
}

// ---------- Events ----------
#[derive(Debug, Clone)]
pub struct ContactCreated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: String,
    pub company: Option<String>,
    pub email: Email,
    pub phone: Option<PhoneNumber>,
    pub custom_fields: JsonValue,
    pub lead_score: i32,
    pub created_at: DateTime<Utc>,
    pub version: i32,
}

#[derive(Debug, Clone)]
pub struct ContactUpdated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub name: Option<String>,
    pub company: Option<Option<String>>,
    pub email: Option<Email>,
    pub phone: Option<Option<PhoneNumber>>,
    pub custom_fields: Option<JsonValue>,
    pub lead_score: Option<i32>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
}

impl Contact {
    pub fn apply_update(&mut self, event: &ContactUpdated) {
        if let Some(name) = &event.name { self.name = name.clone(); }
        if let Some(company) = &event.company { self.company = company.clone(); }
        if let Some(email) = &event.email { self.email = email.clone(); }
        if let Some(phone) = &event.phone { self.phone = phone.clone(); }
        if let Some(custom_fields) = &event.custom_fields { self.custom_fields = custom_fields.clone(); }
        self.updated_at = event.updated_at;
        self.version = event.version;
    }
}

// ---------- Pure Domain Functions ----------
pub fn create_contact(
    cmd: CreateContactCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<ContactCreated, CinqDomainError> {
    validate_contact_name(&cmd.name)?;
    validate_contact_email(&cmd.email)?;
    validate_contact_phone(&cmd.phone)?;

    let id = id_gen.new_uuid_v7();
    let now = clock.now().into();
    Ok(ContactCreated {
        id,
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        company: cmd.company,
        email: cmd.email,
        phone: cmd.phone,
        custom_fields: cmd.custom_fields,
        lead_score: cmd.lead_score.unwrap_or(0),
        created_at: now,
        version: 0,
    })
}

pub fn update_contact(cmd: UpdateContactCommand, clock: &dyn Clock) -> ContactUpdated {
    let now = clock.now().into();
    ContactUpdated {
        id: cmd.id,
        tenant_id: cmd.tenant_id,
        name: cmd.name,
        company: cmd.company,
        email: cmd.email,
        phone: cmd.phone,
        custom_fields: cmd.custom_fields,
        lead_score: cmd.lead_score,
        updated_at: now,
        version: cmd.expected_version + 1,
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
    Ok(())
}

pub fn validate_contact_phone(phone: &Option<PhoneNumber>) -> CinqResult<()> {
    if let Some(p) = phone {
        if p.as_ref().len() < 7 {
            return Err(CinqDomainError::InvalidPhone);
        }
    }
    Ok(())
}

impl ataqu_kernel::Identifiable for Contact {
    fn id(&self) -> uuid::Uuid {
        self.id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

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
            company: None,
            email: Email::new("alice@example.com".to_string()),
            phone: None,
            custom_fields: serde_json::Value::Null,
            lead_score: None,
        };
        let mut id_gen = MockIdGenerator::new();
        let fixed_id = Uuid::new_v4();
        id_gen.set_next_uuid(fixed_id);
        let clock = MockClock::new(Utc.with_ymd_and_hms(2026, 8, 1, 12, 0, 0).unwrap());

        let event = create_contact(cmd.clone(), &id_gen, &clock).unwrap();

        assert_eq!(event.id, fixed_id);
        assert_eq!(event.tenant_id, cmd.tenant_id);
        assert_eq!(event.name, cmd.name);
        assert_eq!(event.email, cmd.email);
        assert_eq!(event.phone, cmd.phone);
        let created_at: DateTime<Utc> = clock.now().into();
        assert_eq!(event.created_at, created_at);
        assert_eq!(event.version, 0);
    }

    #[test]
    fn update_contact_should_set_updated_at() {
        let cmd = UpdateContactCommand {
            id: Uuid::new_v4(),
            tenant_id: TenantId::new(Uuid::new_v4()),
            name: Some("Bob".to_string()),
            company: None,
            email: None,
            phone: Some(Some(PhoneNumber::new("+1234567890".to_string()))),
            custom_fields: None,
            lead_score: None,
            expected_version: 0,
        };
        let clock = MockClock::new(Utc.with_ymd_and_hms(2026, 8, 1, 13, 0, 0).unwrap());

        let event = update_contact(cmd.clone(), &clock);

        assert_eq!(event.id, cmd.id);
        assert_eq!(event.tenant_id, cmd.tenant_id);
        assert_eq!(event.name, cmd.name);
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
