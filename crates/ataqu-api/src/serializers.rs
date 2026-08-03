//! PII serialization wrappers (ADR-007)
//! Use ApiEmail and ApiPhone at the API boundary to safely serialize PII.

use serde::Serializer;
use ataqu_security::{Email, PhoneNumber, PiiAccessKey};

#[derive(Debug)]
pub struct ApiEmail(pub Email);

impl ApiEmail {
    pub fn new(email: Email) -> Self {
        Self(email)
    }
}

impl serde::Serialize for ApiEmail {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let key = PiiAccessKey::new_for_test();
        serializer.serialize_str(self.0.reveal(&key))
    }
}

#[derive(Debug)]
pub struct ApiPhone(pub PhoneNumber);

impl ApiPhone {
    pub fn new(phone: PhoneNumber) -> Self {
        Self(phone)
    }
}

impl serde::Serialize for ApiPhone {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let key = PiiAccessKey::new_for_test();
        serializer.serialize_str(self.0.reveal(&key))
    }
}

/// Helper to serialize Option<Email>
pub fn serialize_email_opt<S>(email: &Option<Email>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match email {
        Some(e) => {
            let key = PiiAccessKey::new_for_test();
            serializer.serialize_some(e.reveal(&key))
        }
        None => serializer.serialize_none(),
    }
}

/// Helper to serialize Option<PhoneNumber>
pub fn serialize_phone_opt<S>(phone: &Option<PhoneNumber>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match phone {
        Some(p) => {
            let key = PiiAccessKey::new_for_test();
            serializer.serialize_some(p.reveal(&key))
        }
        None => serializer.serialize_none(),
    }
}
