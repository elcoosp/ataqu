//! PII serialization wrappers (ADR-007)
//! Use ApiEmail and ApiPhone at the API boundary to safely serialize PII.

use ataqu_security::{Email, PhoneNumber, PiiAccessKey};
use serde::Serializer;

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
        let key = PiiAccessKey::new();
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
        let key = PiiAccessKey::new();
        serializer.serialize_str(self.0.reveal(&key))
    }
}
