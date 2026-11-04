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
        let key = PiiAccessKey::new();
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
        let key = PiiAccessKey::new();
        serializer.serialize_str(self.0.reveal(&key))
    }
}

/// Neutralize CSV formula injection (OWASP "CSV Injection").
///
/// Re-exported from [`ataqu_security::csv`] — the canonical implementation
/// lives there so non-API crates (application services) can use it too.
pub use ataqu_security::csv::sanitize_csv_field;

#[cfg(test)]
mod csv_sanitize_tests {
    use super::sanitize_csv_field;

    #[test]
    fn dangerous_leading_characters_are_prefixed() {
        for payload in [
            "=HYPERLINK(\"http://evil\",\"x\")",
            "+SUM(1,2)",
            "-2+3+cmd|'/c calc'!A1",
            "@SUM(1)",
            "\t=x",
            "\rx",
        ] {
            let out = sanitize_csv_field(payload);
            assert!(out.starts_with('\''), "{payload:?} must be defanged");
        }
    }

    #[test]
    fn benign_values_are_untouched() {
        assert_eq!(sanitize_csv_field("Jane Doe"), "Jane Doe");
        assert_eq!(sanitize_csv_field("jane@example.com"), "jane@example.com");
        assert_eq!(sanitize_csv_field(""), "");
        assert_eq!(sanitize_csv_field("a=b"), "a=b");
    }
}
