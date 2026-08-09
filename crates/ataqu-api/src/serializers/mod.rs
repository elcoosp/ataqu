//! API‑layer serialization wrappers for PII newtypes.
//! These implement `Serialize` to reveal the inner value for HTTP responses.

use ataqu_security::{Email, PhoneNumber, PiiAccessKey};
use serde::{Serialize, Serializer};

/// Wrapper for `Email` that serializes the actual email address.
pub struct ApiEmail<'a>(pub &'a Email);

impl<'a> Serialize for ApiEmail<'a> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let key = PiiAccessKey::new();
        serializer.serialize_str(self.0.reveal(&key))
    }
}

/// Wrapper for `PhoneNumber` that serializes the actual phone number.
pub struct ApiPhone<'a>(pub &'a PhoneNumber);

impl<'a> Serialize for ApiPhone<'a> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let key = PiiAccessKey::new();
        serializer.serialize_str(self.0.reveal(&key))
    }
}
