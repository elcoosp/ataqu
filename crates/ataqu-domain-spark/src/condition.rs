#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Condition {
    FieldEquals { field: String, value: serde_json::Value },
    FieldNotEquals { field: String, value: serde_json::Value },
    FieldContains { field: String, value: String },
    FieldNotContains { field: String, value: String },
    FieldGreaterThan { field: String, value: f64 },
    FieldLessThan { field: String, value: f64 },
    FieldGreaterThanOrEqual { field: String, value: f64 },
    FieldLessThanOrEqual { field: String, value: f64 },
    FieldExists { field: String },
    FieldNotExists { field: String },
    FieldIn { field: String, values: Vec<serde_json::Value> },
    And { conditions: Vec<Condition> },
    Or { conditions: Vec<Condition> },
    Not { condition: Box<Condition> },
}

pub fn evaluate_conditions(conditions: &[Condition], payload: &serde_json::Value) -> bool {
    conditions.iter().all(|c| evaluate_condition(c, payload))
}

fn evaluate_condition(cond: &Condition, payload: &serde_json::Value) -> bool {
    match cond {
        Condition::FieldEquals { field, value } => payload.get(field) == Some(value),
        Condition::FieldNotEquals { field, value } => payload.get(field) != Some(value),
        Condition::FieldContains { field, value } => {
            payload.get(field).and_then(|v| v.as_str()).map(|s| s.contains(value)).unwrap_or(false)
        }
        Condition::FieldNotContains { field, value } => {
            !payload.get(field).and_then(|v| v.as_str()).map(|s| s.contains(value)).unwrap_or(true)
        }
        Condition::FieldGreaterThan { field, value } => {
            payload.get(field).and_then(|v| v.as_f64()).map(|n| n > *value).unwrap_or(false)
        }
        Condition::FieldLessThan { field, value } => {
            payload.get(field).and_then(|v| v.as_f64()).map(|n| n < *value).unwrap_or(false)
        }
        Condition::FieldGreaterThanOrEqual { field, value } => {
            payload.get(field).and_then(|v| v.as_f64()).map(|n| n >= *value).unwrap_or(false)
        }
        Condition::FieldLessThanOrEqual { field, value } => {
            payload.get(field).and_then(|v| v.as_f64()).map(|n| n <= *value).unwrap_or(false)
        }
        Condition::FieldExists { field } => payload.get(field).is_some(),
        Condition::FieldNotExists { field } => payload.get(field).is_none(),
        Condition::FieldIn { field, values } => {
            payload.get(field).map(|v| values.contains(v)).unwrap_or(false)
        }
        Condition::And { conditions } => conditions.iter().all(|c| evaluate_condition(c, payload)),
        Condition::Or { conditions } => conditions.iter().any(|c| evaluate_condition(c, payload)),
        Condition::Not { condition } => !evaluate_condition(condition, payload),
    }
}
