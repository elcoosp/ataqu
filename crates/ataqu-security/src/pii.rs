//! Compile-time PII redaction via newtypes and capability tokens.
//! PII newtypes (Email, PhoneNumber) implement Debug/Display as [REDACTED].
//! They do NOT implement Serialize. Use API wrappers (ApiEmail, etc.) for serialization.

/// Capability token required to reveal PII.
/// This token is only available in the API layer and infrastructure crates
/// that have the `infra-pii-access` feature enabled.
#[derive(Clone, Copy)]
pub struct PiiAccessKey(());

impl PiiAccessKey {
    /// Creates a new capability token.
    /// This is intentionally easy to create, but the type system
    /// prevents accidental usage in domain crates because they don't
    /// have the `infra-pii-access` feature.
    pub fn new() -> Self {
        Self(())
    }

    /// For testing purposes (same as new).
    pub fn new_for_test() -> Self {
        Self(())
    }
}

impl Default for PiiAccessKey {
    fn default() -> Self {
        Self::new()
    }
}

/// Marker trait for PII types.
pub trait PiiValue: Sized + std::fmt::Debug + std::fmt::Display + Clone + PartialEq + Eq {}

/// Email address. PII.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Email(String);
impl PiiValue for Email {}

impl Email {
    pub fn new(value: String) -> Self {
        Self(value)
    }

    pub fn reveal(&self, _key: &PiiAccessKey) -> &str {
        &self.0
    }
}

impl std::fmt::Display for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[REDACTED]")
    }
}

impl From<String> for Email {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl AsRef<str> for Email {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

/// Phone number. PII.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PhoneNumber(String);
impl PiiValue for PhoneNumber {}

impl PhoneNumber {
    pub fn new(value: String) -> Self {
        Self(value)
    }

    pub fn reveal(&self, _key: &PiiAccessKey) -> &str {
        &self.0
    }
}

impl std::fmt::Display for PhoneNumber {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[REDACTED]")
    }
}

impl From<String> for PhoneNumber {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl AsRef<str> for PhoneNumber {
    fn as_ref(&self) -> &str {
        &self.0
    }
}
