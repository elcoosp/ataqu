//! API‑layer serialization wrappers for PII newtypes.
//! These own the PII data and implement `Serialize` to reveal the inner value for HTTP responses.

use ataqu_security::{Email, PhoneNumber, PiiAccessKey};
use serde::{Serialize, Serializer};

/// Wrapper for `Email` that serializes the actual email address.
#[derive(Debug, Clone)]
pub struct ApiEmail(pub Email);

impl Serialize for ApiEmail {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let key = PiiAccessKey::new_for_test();
        serializer.serialize_str(self.0.reveal(&key))
    }
}

/// Wrapper for `PhoneNumber` that serializes the actual phone number.
#[derive(Debug, Clone)]
pub struct ApiPhone(pub PhoneNumber);

impl Serialize for ApiPhone {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let key = PiiAccessKey::new_for_test();
        serializer.serialize_str(self.0.reveal(&key))
    }
}
