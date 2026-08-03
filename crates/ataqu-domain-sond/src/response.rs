use crate::errors::SondError;
use crate::question::{Question, is_question_visible};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// These types do NOT contain TenantId, so we can derive Serialize/Deserialize
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum AnswerValue {
    Text(String),
    Number(f64),
    Date(chrono::NaiveDate),
    Choice(String),
    MultipleChoice(Vec<String>),
    Rating(u8),
    Email(String),
    Phone(String),
    Boolean(bool),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Answer {
    pub question_id: Uuid,
    pub value: AnswerValue,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AnswerInput {
    pub question_id: Uuid,
    pub value: AnswerValue,
}

// Response contains TenantId -> no Serialize/Deserialize
#[derive(Debug, Clone, PartialEq)]
pub struct Response {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub form_id: Uuid,
    pub answers: Vec<Answer>,
    pub respondent_id: Option<Uuid>,
    pub submitted_at: DateTime<Utc>,
}

// Command contains TenantId -> no Deserialize (application layer builds it)
#[derive(Debug, Clone)]
pub struct SubmitResponseCommand {
    pub tenant_id: TenantId,
    pub form_id: Uuid,
    pub answers: Vec<AnswerInput>,
    pub respondent_id: Option<Uuid>,
}

// Event contains TenantId -> no Serialize/Deserialize
#[derive(Debug, Clone, PartialEq)]
pub struct ResponseSubmitted {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub form_id: Uuid,
    pub answer_count: usize,
    pub submitted_at: DateTime<Utc>,
}

pub fn validate_answers(
    answers: &[AnswerInput],
    questions: &[Question],
) -> Result<Vec<Answer>, SondError> {
    let q_map: std::collections::HashMap<_, _> = questions.iter().map(|q| (q.id, q)).collect();

    let mut answer_map: std::collections::HashMap<Uuid, AnswerValue> =
        std::collections::HashMap::new();
    for ans in answers {
        let question = q_map
            .get(&ans.question_id)
            .ok_or(SondError::QuestionNotFound(ans.question_id))?;
        validate_answer_value(&ans.value, question)?;
        answer_map.insert(ans.question_id, ans.value.clone());
    }

    // Build a list of all answers for visibility checks
    let all_answers: Vec<Answer> = answer_map
        .iter()
        .map(|(id, value)| Answer {
            question_id: *id,
            value: value.clone(),
        })
        .collect();

    // Check visibility and required for each question
    for (q_id, question) in &q_map {
        let is_visible = is_question_visible(question, &all_answers)?;
        if !is_visible {
            continue;
        }
        if question.required && !answer_map.contains_key(q_id) {
            return Err(SondError::MissingRequiredAnswer(*q_id));
        }
    }

    // Build validated list: include only answers to visible questions
    let mut validated = Vec::new();
    for ans in answers {
        let question = q_map
            .get(&ans.question_id)
            .ok_or(SondError::QuestionNotFound(ans.question_id))?;
        let is_visible = is_question_visible(question, &all_answers)?;
        if is_visible {
            validated.push(Answer {
                question_id: ans.question_id,
                value: ans.value.clone(),
            });
        }
    }

    Ok(validated)
}

fn validate_answer_value(value: &AnswerValue, question: &Question) -> Result<(), SondError> {
    match (&question.question_type, value) {
        (crate::question::QuestionType::Text, AnswerValue::Text(_)) => Ok(()),
        (crate::question::QuestionType::Number, AnswerValue::Number(_)) => Ok(()),
        (crate::question::QuestionType::Date, AnswerValue::Date(_)) => Ok(()),
        (crate::question::QuestionType::Choice { options }, AnswerValue::Choice(selected)) => {
            if options.contains(selected) {
                Ok(())
            } else {
                Err(SondError::InvalidChoiceValue(selected.clone()))
            }
        }
        (
            crate::question::QuestionType::MultipleChoice { options },
            AnswerValue::MultipleChoice(selected),
        ) => {
            if selected.iter().all(|s| options.contains(s)) {
                Ok(())
            } else {
                Err(SondError::InvalidChoiceValue(selected.join(", ")))
            }
        }
        (crate::question::QuestionType::Rating { min, max }, AnswerValue::Rating(v)) => {
            if *min <= *v && *v <= *max {
                Ok(())
            } else {
                Err(SondError::InvalidRatingValue(*v))
            }
        }
        (crate::question::QuestionType::Email, AnswerValue::Email(_)) => Ok(()),
        (crate::question::QuestionType::Phone, AnswerValue::Phone(_)) => Ok(()),
        _ => Err(SondError::TypeMismatch),
    }
}

pub fn submit_response(
    cmd: SubmitResponseCommand,
    form: &crate::form::Form,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<ResponseSubmitted, SondError> {
    let validated_answers = validate_answers(&cmd.answers, &form.questions)?;

    let response_id = id_gen.new_uuid_v7();
    let now = clock.now();
    let submitted_at = DateTime::<Utc>::from(now);

    let response = Response {
        id: response_id,
        tenant_id: cmd.tenant_id,
        form_id: cmd.form_id,
        answers: validated_answers,
        respondent_id: cmd.respondent_id,
        submitted_at,
    };

    Ok(ResponseSubmitted {
        id: response.id,
        tenant_id: response.tenant_id,
        form_id: response.form_id,
        answer_count: response.answers.len(),
        submitted_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::question::{Condition, ConditionOperator, QuestionType};
    use ataqu_kernel::{Clock, IdGenerator};
    use chrono::Utc;

    struct TestIdGenerator;
    impl IdGenerator for TestIdGenerator {
        fn new_uuid_v7(&self) -> Uuid {
            Uuid::new_v4()
        }
    }

    struct TestClock;
    impl Clock for TestClock {
        fn now(&self) -> std::time::SystemTime {
            std::time::SystemTime::now()
        }
    }

    fn sample_question(id: Uuid, label: &str, qtype: QuestionType, required: bool) -> Question {
        Question {
            id,
            label: label.to_string(),
            question_type: qtype,
            required,
            conditions: vec![],
        }
    }

    fn sample_question_with_condition(
        id: Uuid,
        label: &str,
        qtype: QuestionType,
        required: bool,
        cond: Condition,
    ) -> Question {
        Question {
            id,
            label: label.to_string(),
            question_type: qtype,
            required,
            conditions: vec![cond],
        }
    }

    #[test]
    fn validate_answers_success() {
        let q1 = Uuid::new_v4();
        let q2 = Uuid::new_v4();
        let questions = vec![
            sample_question(q1, "Name", QuestionType::Text, true),
            sample_question(q2, "Age", QuestionType::Number, false),
        ];
        let answers = vec![
            AnswerInput {
                question_id: q1,
                value: AnswerValue::Text("Alice".to_string()),
            },
            AnswerInput {
                question_id: q2,
                value: AnswerValue::Number(30.0),
            },
        ];
        let result = validate_answers(&answers, &questions);
        assert!(result.is_ok());
        let validated = result.unwrap();
        assert_eq!(validated.len(), 2);
    }

    #[test]
    fn validate_answers_missing_required() {
        let q1 = Uuid::new_v4();
        let questions = vec![sample_question(q1, "Name", QuestionType::Text, true)];
        let answers = vec![];
        let result = validate_answers(&answers, &questions);
        assert!(matches!(result, Err(SondError::MissingRequiredAnswer(id)) if id == q1));
    }

    #[test]
    fn validate_answers_type_mismatch() {
        let q1 = Uuid::new_v4();
        let questions = vec![sample_question(q1, "Age", QuestionType::Number, false)];
        let answers = vec![AnswerInput {
            question_id: q1,
            value: AnswerValue::Text("thirty".to_string()),
        }];
        let result = validate_answers(&answers, &questions);
        assert!(matches!(result, Err(SondError::TypeMismatch)));
    }

    #[test]
    fn validate_answers_conditional_visibility() {
        let q1 = Uuid::new_v4();
        let q2 = Uuid::new_v4();
        let cond = Condition {
            question_id: q1,
            operator: ConditionOperator::Equals,
            value: serde_json::json!("yes"),
        };
        let questions = vec![
            sample_question(q1, "Condition", QuestionType::Text, true),
            sample_question_with_condition(q2, "Dependent", QuestionType::Text, true, cond),
        ];
        let answers = vec![
            AnswerInput {
                question_id: q1,
                value: AnswerValue::Text("yes".to_string()),
            },
            AnswerInput {
                question_id: q2,
                value: AnswerValue::Text("visible".to_string()),
            },
        ];
        let result = validate_answers(&answers, &questions);
        assert!(result.is_ok());
        let validated = result.unwrap();
        assert_eq!(validated.len(), 2);

        let answers = vec![
            AnswerInput {
                question_id: q1,
                value: AnswerValue::Text("no".to_string()),
            },
            AnswerInput {
                question_id: q2,
                value: AnswerValue::Text("should be ignored".to_string()),
            },
        ];
        let result = validate_answers(&answers, &questions);
        assert!(result.is_ok());
        let validated = result.unwrap();
        assert_eq!(validated.len(), 1);
        assert_eq!(validated[0].question_id, q1);
    }

    #[test]
    fn submit_response_success() {
        let id_gen = TestIdGenerator;
        let clock = TestClock;
        let tenant = TenantId::new(Uuid::new_v4());
        let form_id = Uuid::new_v4();
        let q1 = Uuid::new_v4();
        let form = crate::form::Form {
            id: form_id,
            tenant_id: tenant,
            title: "Form".to_string(),
            description: None,
            questions: vec![sample_question(q1, "Name", QuestionType::Text, true)],
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let cmd = SubmitResponseCommand {
            tenant_id: tenant,
            form_id,
            answers: vec![AnswerInput {
                question_id: q1,
                value: AnswerValue::Text("Bob".to_string()),
            }],
            respondent_id: None,
        };
        let result = submit_response(cmd, &form, &id_gen, &clock);
        assert!(result.is_ok());
        let event = result.unwrap();
        assert_eq!(event.answer_count, 1);
    }
}
