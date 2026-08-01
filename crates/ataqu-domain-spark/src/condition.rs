#[derive(Debug, Clone, PartialEq)]
pub enum Condition {
    FieldEquals { field: String, value: String },
    FieldContains { field: String, value: String },
}
