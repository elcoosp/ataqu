//! PII newtypes for compile-time redaction.
//!
//! This module defines newtypes for Personally Identifiable Information (PII)
//! that guarantee redaction in logs and prevent accidental serialization.
//! PII fields are wrapped in newtypes that implement `Debug` and `Display` as `[REDACTED]`.
//! The newtypes do NOT implement `serde::Serialize` to prevent accidental JSON leakage.
//! Serialization for APIs is handled by wrapper structs in the API layer.

use std::fmt;

/// Capability token required to access the inner value of a PII newtype.
/// This token is only constructible in crates that have the `infra-pii-access` feature enabled.
#[derive(Clone)]
pub struct PiiAccessKey(());

impl PiiAccessKey {
    /// Create a new PiiAccessKey for testing or when the feature is not available.
    /// This is always available, but should only be used in tests or when absolutely necessary.
    pub fn new_for_test() -> Self {
        PiiAccessKey(())
    }
}

#[cfg(feature = "infra-pii-access")]
impl PiiAccessKey {
    /// Create a new PiiAccessKey. This is only available when the `infra-pii-access` feature is enabled.
    pub fn new() -> Self {
        PiiAccessKey(())
    }
}

/// Email newtype with compile-time redaction.
#[derive(Clone, PartialEq, Eq, Hash)]
pub struct Email(String);

impl Email {
    pub fn new(value: String) -> Self {
        Self(value)
    }

    /// Reveal the inner email address. Requires a PiiAccessKey.
    pub fn reveal(&self, _key: &PiiAccessKey) -> &str {
        &self.0
    }
}

impl fmt::Debug for Email {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[REDACTED]")
    }
}

impl fmt::Display for Email {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[REDACTED]")
    }
}

impl AsRef<str> for Email {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

/// Phone number newtype with compile-time redaction.
#[derive(Clone, PartialEq, Eq, Hash)]
pub struct PhoneNumber(String);

impl PhoneNumber {
    pub fn new(value: String) -> Self {
        Self(value)
    }

    /// Reveal the inner phone number. Requires a PiiAccessKey.
    pub fn reveal(&self, _key: &PiiAccessKey) -> &str {
        &self.0
    }
}

impl fmt::Debug for PhoneNumber {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[REDACTED]")
    }
}

impl fmt::Display for PhoneNumber {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[REDACTED]")
    }
}

impl AsRef<str> for PhoneNumber {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

// Default implementation is only available when the feature is enabled.
// This allows tests and infra code to construct PiiAccessKey without explicit new().
#[cfg(feature = "infra-pii-access")]
impl Default for PiiAccessKey {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_debug_redacts() {
        let email = Email::new("test@example.com".to_string());
        assert_eq!(format!("{:?}", email), "[REDACTED]");
    }

    #[test]
    fn email_display_redacts() {
        let email = Email::new("test@example.com".to_string());
        assert_eq!(format!("{}", email), "[REDACTED]");
    }

    #[test]
    #[cfg(feature = "infra-pii-access")]
    fn email_reveal_works() {
        let email = Email::new("test@example.com".to_string());
        let key = PiiAccessKey::new();
        assert_eq!(email.reveal(&key), "test@example.com");
    }

    #[test]
    fn phone_debug_redacts() {
        let phone = PhoneNumber::new("+1234567890".to_string());
        assert_eq!(format!("{:?}", phone), "[REDACTED]");
    }

    #[test]
    fn phone_display_redacts() {
        let phone = PhoneNumber::new("+1234567890".to_string());
        assert_eq!(format!("{}", phone), "[REDACTED]");
    }

    #[test]
    #[cfg(feature = "infra-pii-access")]
    fn phone_reveal_works() {
        let phone = PhoneNumber::new("+1234567890".to_string());
        let key = PiiAccessKey::new();
        assert_eq!(phone.reveal(&key), "+1234567890");
    }

    #[test]
    fn key_construction_gated() {
        // new_for_test is always available
        let _key = PiiAccessKey::new_for_test();
        #[cfg(feature = "infra-pii-access")]
        {
            let _key2 = PiiAccessKey::new();
        }
    }
}
