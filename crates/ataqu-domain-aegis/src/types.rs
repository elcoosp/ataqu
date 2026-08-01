//! Temporary local PII types until ataqu-security provides them.
//! TODO: Replace with ataqu_security::pii::Email once available.

use std::fmt;

/// A newtype wrapper for email addresses.
/// Provides compile-time PII redaction via Debug/Display.
#[derive(Clone, PartialEq, Eq, Hash)]
pub struct Email(String);

impl Email {
    /// Creates a new Email from a string.
    pub fn new(value: String) -> Self {
        Self(value)
    }

    /// Returns the inner string (for testing and serialization in API layer).
    pub fn as_str(&self) -> &str {
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
