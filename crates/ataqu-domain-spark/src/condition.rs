#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum Condition {
    FieldEquals { field: String, value: String },
    FieldContains { field: String, value: String },
}
