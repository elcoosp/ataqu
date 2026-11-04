//! CSV output hardening shared by every export endpoint.

/// Neutralize CSV formula injection (OWASP "CSV Injection").
///
/// Spreadsheet applications interpret cells whose first character is `=`, `+`,
/// `-`, `@`, TAB or CR as formulas; a value like `=HYPERLINK("http://evil")`
/// or `=cmd|'/c calc'!A1` would execute when an exported file is opened.
/// The value is stored/checked verbatim — only the *exported* cell is
/// defanged by prefixing a single quote, the standard mitigation.
pub fn sanitize_csv_field(raw: &str) -> String {
    let first = raw.chars().next();
    match first {
        Some('=' | '+' | '-' | '@' | '\t' | '\r') => format!("'{raw}"),
        _ => raw.to_string(),
    }
}

#[cfg(test)]
mod tests {
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
