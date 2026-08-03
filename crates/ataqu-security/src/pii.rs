use std::fmt;
use serde::Serialize;

/// A capability token that allows revealing PII.
#[derive(Clone, Copy)]
pub struct PiiAccessKey(());

impl PiiAccessKey {
    /// Creates a new access key. Only available when the feature is enabled.
    #[cfg(feature = "infra-pii-access")]
    pub fn new() -> Self {
        PiiAccessKey(())
    }

    /// Test-only constructor, always available.
    #[doc(hidden)]
    pub fn new_for_test() -> Self {
        PiiAccessKey(())
    }
}

/// An email address.
#[derive(Clone, PartialEq, Eq, Hash, Serialize)]
pub struct Email(String);

impl Email {
    pub fn new(value: String) -> Self {
        Self(value)
    }

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

/// A phone number.
#[derive(Clone, PartialEq, Eq, Hash, Serialize)]
pub struct PhoneNumber(String);

impl PhoneNumber {
    pub fn new(value: String) -> Self {
        Self(value)
    }

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_debug_redacts() {
        let email = Email::new("alice@example.com".to_string());
        assert_eq!(format!("{:?}", email), "[REDACTED]");
    }

    #[test]
    fn email_display_redacts() {
        let email = Email::new("alice@example.com".to_string());
        assert_eq!(format!("{}", email), "[REDACTED]");
    }

    #[test]
    fn email_reveal_works() {
        let email = Email::new("alice@example.com".to_string());
        let key = PiiAccessKey::new_for_test();
        assert_eq!(email.reveal(&key), "alice@example.com");
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
    fn phone_reveal_works() {
        let phone = PhoneNumber::new("+1234567890".to_string());
        let key = PiiAccessKey::new_for_test();
        assert_eq!(phone.reveal(&key), "+1234567890");
    }

    #[test]
    #[cfg(feature = "infra-pii-access")]
    fn key_construction_gated() {
        let _key = PiiAccessKey::new();
    }
}
