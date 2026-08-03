use crate::errors::SondError;
use ataqu_kernel::IdGenerator;
use serde::{Deserialize, Serialize};
use serde_json; // added import
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum QuestionType {
    Text,
    Number,
    Date,
    Choice { options: Vec<String> },
    MultipleChoice { options: Vec<String> },
    Rating { min: u8, max: u8 },
    Email,
    Phone,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Condition {
    pub question_id: Uuid,
    pub operator: ConditionOperator,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConditionOperator {
    Equals,
    NotEquals,
    GreaterThan,
    LessThan,
    Contains,
    NotContains,
    IsEmpty,
    IsNotEmpty,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Question {
    pub id: Uuid,
    pub label: String,
    pub question_type: QuestionType,
    pub required: bool,
    pub conditions: Vec<Condition>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QuestionInput {
    pub label: String,
    pub question_type: QuestionType,
    pub required: bool,
    pub conditions: Vec<Condition>,
}

impl QuestionInput {
    pub fn validate(&self) -> Result<(), SondError> {
        if self.label.trim().is_empty() {
            return Err(SondError::InvalidQuestionLabel(
                "Question label cannot be empty".to_string(),
            ));
        }
        match &self.question_type {
            QuestionType::Choice { options } | QuestionType::MultipleChoice { options } => {
                if options.is_empty() {
                    return Err(SondError::InvalidQuestionOptions(
                        "Choice questions must have at least one option".to_string(),
                    ));
                }
                if options.iter().any(|s| s.trim().is_empty()) {
                    return Err(SondError::InvalidQuestionOptions(
                        "Options cannot be empty strings".to_string(),
                    ));
                }
            }
            QuestionType::Rating { min, max } if (*max <= *min || *min < 1 || *max > 10) => {
                return Err(SondError::InvalidRatingRange(
                    "Rating must have min < max and be between 1 and 10".to_string(),
                ));
            }
            QuestionType::Rating { min: _, max: _ } => {}
            _ => {}
        }
        Ok(())
    }

    pub fn into_question(self, id_gen: &dyn IdGenerator) -> Question {
        Question {
            id: id_gen.new_uuid_v7(),
            label: self.label,
            question_type: self.question_type,
            required: self.required,
            conditions: self.conditions,
        }
    }
}

pub fn is_question_visible(
    question: &Question,
    answers: &[crate::response::Answer],
) -> Result<bool, SondError> {
    if question.conditions.is_empty() {
        return Ok(true);
    }

    let answer_map: std::collections::HashMap<_, _> =
        answers.iter().map(|a| (a.question_id, &a.value)).collect();

    for cond in &question.conditions {
        let answer_val = answer_map.get(&cond.question_id).ok_or_else(|| {
            SondError::ConditionError(format!("Question {} not answered", cond.question_id))
        })?;

        let satisfied = match &cond.operator {
            ConditionOperator::Equals => match (answer_val, &cond.value) {
                (crate::response::AnswerValue::Text(t), serde_json::Value::String(s)) => t == s,
                (crate::response::AnswerValue::Number(n), serde_json::Value::Number(num)) => {
                    if let Some(f) = num.as_f64() {
                        (*n - f).abs() < 1e-9
                    } else {
                        false
                    }
                }
                (crate::response::AnswerValue::Choice(c), serde_json::Value::String(s)) => c == s,
                (crate::response::AnswerValue::Rating(r), serde_json::Value::Number(num)) => {
                    if let Some(f) = num.as_f64() {
                        (*r as f64 - f).abs() < 1e-9
                    } else {
                        false
                    }
                }
                _ => false,
            },
            ConditionOperator::NotEquals => {
                !is_condition_satisfied(answer_val, &cond.value, &ConditionOperator::Equals)
            }
            ConditionOperator::GreaterThan => match (answer_val, &cond.value) {
                (crate::response::AnswerValue::Number(n), serde_json::Value::Number(num)) => {
                    if let Some(f) = num.as_f64() {
                        *n > f
                    } else {
                        false
                    }
                }
                (crate::response::AnswerValue::Rating(r), serde_json::Value::Number(num)) => {
                    if let Some(f) = num.as_f64() {
                        (*r as f64) > f
                    } else {
                        false
                    }
                }
                _ => false,
            },
            ConditionOperator::LessThan => match (answer_val, &cond.value) {
                (crate::response::AnswerValue::Number(n), serde_json::Value::Number(num)) => {
                    if let Some(f) = num.as_f64() {
                        *n < f
                    } else {
                        false
                    }
                }
                (crate::response::AnswerValue::Rating(r), serde_json::Value::Number(num)) => {
                    if let Some(f) = num.as_f64() {
                        (*r as f64) < f
                    } else {
                        false
                    }
                }
                _ => false,
            },
            ConditionOperator::Contains => match (answer_val, &cond.value) {
                (crate::response::AnswerValue::Text(t), serde_json::Value::String(s)) => {
                    t.contains(s)
                }
                (crate::response::AnswerValue::Choice(c), serde_json::Value::String(s)) => {
                    c.contains(s)
                }
                _ => false,
            },
            ConditionOperator::NotContains => match (answer_val, &cond.value) {
                (crate::response::AnswerValue::Text(t), serde_json::Value::String(s)) => {
                    !t.contains(s)
                }
                (crate::response::AnswerValue::Choice(c), serde_json::Value::String(s)) => {
                    !c.contains(s)
                }
                _ => false,
            },
            ConditionOperator::IsEmpty => match answer_val {
                crate::response::AnswerValue::Text(t) => t.is_empty(),
                crate::response::AnswerValue::Choice(c) => c.is_empty(),
                crate::response::AnswerValue::MultipleChoice(c) => c.is_empty(),
                _ => false,
            },
            ConditionOperator::IsNotEmpty => match answer_val {
                crate::response::AnswerValue::Text(t) => !t.is_empty(),
                crate::response::AnswerValue::Choice(c) => !c.is_empty(),
                crate::response::AnswerValue::MultipleChoice(c) => !c.is_empty(),
                _ => false,
            },
        };
        if !satisfied {
            return Ok(false);
        }
    }
    Ok(true)
}

fn is_condition_satisfied(
    answer_val: &crate::response::AnswerValue,
    cond_val: &serde_json::Value,
    _op: &ConditionOperator,
) -> bool {
    match (answer_val, cond_val) {
        (crate::response::AnswerValue::Text(t), serde_json::Value::String(s)) => t == s,
        (crate::response::AnswerValue::Number(n), serde_json::Value::Number(num)) => {
            if let Some(f) = num.as_f64() {
                (*n - f).abs() < 1e-9
            } else {
                false
            }
        }
        (crate::response::AnswerValue::Choice(c), serde_json::Value::String(s)) => c == s,
        (crate::response::AnswerValue::Rating(r), serde_json::Value::Number(num)) => {
            if let Some(f) = num.as_f64() {
                (*r as f64 - f).abs() < 1e-9
            } else {
                false
            }
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::response::AnswerValue;

    // We'll use Uuid::new_v4() for tests; they are deterministic enough.
    // For IdGenerator we can use a simple struct.
    #[allow(dead_code)]
    struct TestIdGenerator;
    impl IdGenerator for TestIdGenerator {
        fn new_uuid_v7(&self) -> Uuid {
            Uuid::new_v4()
        }
    }

    #[test]
    fn validate_question_label_empty() {
        let input = QuestionInput {
            label: "   ".to_string(),
            question_type: QuestionType::Text,
            required: false,
            conditions: vec![],
        };
        assert!(matches!(
            input.validate(),
            Err(SondError::InvalidQuestionLabel(_))
        ));
    }

    #[test]
    fn validate_choice_empty_options() {
        let input = QuestionInput {
            label: "Q".to_string(),
            question_type: QuestionType::Choice { options: vec![] },
            required: false,
            conditions: vec![],
        };
        assert!(matches!(
            input.validate(),
            Err(SondError::InvalidQuestionOptions(_))
        ));
    }

    #[test]
    fn validate_rating_range() {
        let input = QuestionInput {
            label: "Q".to_string(),
            question_type: QuestionType::Rating { min: 0, max: 10 },
            required: false,
            conditions: vec![],
        };
        assert!(matches!(
            input.validate(),
            Err(SondError::InvalidRatingRange(_))
        ));
    }

    #[test]
    fn condition_equality_text() {
        let q_id = Uuid::new_v4();
        let cond = Condition {
            question_id: q_id,
            operator: ConditionOperator::Equals,
            value: serde_json::json!("yes"),
        };
        let question = Question {
            id: Uuid::new_v4(),
            label: "test".to_string(),
            question_type: QuestionType::Text,
            required: false,
            conditions: vec![cond],
        };
        let answers = vec![crate::response::Answer {
            question_id: q_id,
            value: AnswerValue::Text("yes".to_string()),
        }];
        assert!(is_question_visible(&question, &answers).unwrap());
    }

    #[test]
    fn condition_greater_than_number() {
        let q_id = Uuid::new_v4();
        let cond = Condition {
            question_id: q_id,
            operator: ConditionOperator::GreaterThan,
            value: serde_json::json!(10),
        };
        let question = Question {
            id: Uuid::new_v4(),
            label: "test".to_string(),
            question_type: QuestionType::Text,
            required: false,
            conditions: vec![cond],
        };
        let answers = vec![crate::response::Answer {
            question_id: q_id,
            value: AnswerValue::Number(15.0),
        }];
        assert!(is_question_visible(&question, &answers).unwrap());
    }
}
