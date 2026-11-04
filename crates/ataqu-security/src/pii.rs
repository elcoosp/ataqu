use serde::Serialize;
use std::fmt;

/// A capability token that allows revealing PII.
#[derive(Clone, Copy, Default)]
pub struct PiiAccessKey(());

impl PiiAccessKey {
    #[cfg(any(test, feature = "infra-pii-access"))]
    pub fn new() -> Self {
        PiiAccessKey(())
    }
}

/// An email address.
///
/// Construction normalizes the value (trim + ASCII lowercase) so lookups and
/// uniqueness constraints are case-insensitive, matching how every major mail
/// provider treats addresses. `parse` additionally enforces a minimal
/// syntax check before an address is accepted by auth flows.
#[derive(Clone, PartialEq, Eq, Hash, Serialize)]
pub struct Email(String);

impl Email {
    /// Normalize (trim + lowercase). No syntax validation — use [`Email::parse`]
    /// when untrusted input must be rejected.
    pub fn new(value: String) -> Self {
        Self(value.trim().to_lowercase())
    }

    /// Normalized construction with a minimal syntax check:
    /// one `@`, non-empty local part, domain with at least one dot and no
    /// whitespace. Suitable as a first-pass filter for user-supplied input.
    pub fn parse(value: &str) -> Result<Self, EmailValidationError> {
        let normalized = value.trim().to_lowercase();
        if normalized.is_empty() || normalized.len() > 254 {
            return Err(EmailValidationError);
        }
        let Some((local, domain)) = normalized.split_once('@') else {
            return Err(EmailValidationError);
        };
        if local.is_empty()
            || domain.is_empty()
            || !domain.contains('.')
            || normalized.chars().any(|c| c.is_whitespace())
            || domain.starts_with('.')
            || domain.ends_with('.')
            || domain.contains("..")
        {
            return Err(EmailValidationError);
        }
        Ok(Self(normalized))
    }

    pub fn reveal(&self, _key: &PiiAccessKey) -> &str {
        &self.0
    }
}

/// Returned by [`Email::parse`] when the input is not a plausible address.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EmailValidationError;

impl fmt::Display for EmailValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "invalid email address")
    }
}

impl std::error::Error for EmailValidationError {}

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

    /// Returns the length of the phone number string.
    pub fn len(&self) -> usize {
        self.0.len()
    }

    /// Returns true if the phone number string is empty.
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
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
        let key = PiiAccessKey::new();
        assert_eq!(email.reveal(&key), "alice@example.com");
    }

    #[test]
    fn email_new_normalizes_case_and_whitespace() {
        let email = Email::new("  Alice@Example.COM ".to_string());
        assert_eq!(email.reveal(&PiiAccessKey::new()), "alice@example.com");
    }

    #[test]
    fn email_parse_accepts_valid_rejects_invalid() {
        assert!(Email::parse("user@example.com").is_ok());
        assert!(Email::parse("USER@Example.COM").is_ok());
        assert!(Email::parse("no-at-sign").is_err());
        assert!(Email::parse("@example.com").is_err());
        assert!(Email::parse("user@").is_err());
        assert!(Email::parse("user@nodot").is_err());
        assert!(Email::parse("user@.example.com").is_err());
        assert!(Email::parse("user@example..com").is_err());
        assert!(Email::parse("us er@example.com").is_err());
        assert!(Email::parse("").is_err());
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
        let key = PiiAccessKey::new();
        assert_eq!(phone.reveal(&key), "+1234567890");
    }

    #[test]
    #[cfg(feature = "infra-pii-access")]
    fn key_construction_gated() {
        let _key = PiiAccessKey::new();
    }
}
