use crate::errors::SondError;
use crate::question::{Question, QuestionInput};
use ataqu_kernel::{Clock, IdGenerator, TenantId};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FormMode {
    #[default]
    Standard,
    Conversational,
}

// Form contains TenantId -> no Serialize/Deserialize
#[derive(Debug, Clone, PartialEq)]
pub struct Form {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub title: String,
    pub description: Option<String>,
    pub questions: Vec<Question>,
    pub branding: serde_json::Value,
    pub mode: FormMode,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
}

// Command contains TenantId -> no Deserialize (application layer builds it)
#[derive(Debug, Clone)]
pub struct CreateFormCommand {
    pub tenant_id: TenantId,
    pub title: String,
    pub description: Option<String>,
    pub questions: Vec<QuestionInput>,
    pub branding: serde_json::Value,
    pub mode: Option<FormMode>,
}

// Event contains TenantId -> no Serialize/Deserialize
#[derive(Debug, Clone, PartialEq)]
pub struct FormCreated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub title: String,
    pub description: Option<String>,
    pub question_count: usize,
    pub branding: serde_json::Value,
    pub mode: FormMode,
    pub created_at: DateTime<Utc>,
}

// Command contains TenantId -> no Deserialize
#[derive(Debug, Clone)]
pub struct UpdateFormCommand {
    pub form_id: Uuid,
    pub title: Option<String>,
    pub description: Option<String>,
    pub questions: Option<Vec<QuestionInput>>,
    pub mode: Option<FormMode>,
    pub expected_version: i32,
}

// Event contains TenantId -> no Serialize/Deserialize
#[derive(Debug, Clone, PartialEq)]
pub struct FormUpdated {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub title: Option<String>,
    pub description: Option<String>,
    pub question_count: usize,
    pub mode: Option<FormMode>,
    pub updated_at: DateTime<Utc>,
}

pub fn create_form(
    cmd: CreateFormCommand,
    id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<FormCreated, SondError> {
    if cmd.title.trim().is_empty() {
        return Err(SondError::InvalidTitle("Title cannot be empty".to_string()));
    }
    if cmd.questions.is_empty() {
        return Err(SondError::InvalidQuestionCount(
            "Form must have at least one question".to_string(),
        ));
    }
    for q in &cmd.questions {
        q.validate()?;
    }

    let form_id = id_gen.new_uuid_v7();
    let now = clock.now();
    let created_at = DateTime::<Utc>::from(now);

    let mut questions = Vec::with_capacity(cmd.questions.len());
    for q_input in cmd.questions {
        let q = q_input.into_question(id_gen);
        questions.push(q);
    }

    let mode = cmd.mode.unwrap_or_default();
    let event = FormCreated {
        id: form_id,
        tenant_id: cmd.tenant_id,
        title: cmd.title,
        description: cmd.description,
        question_count: questions.len(),
        branding: cmd.branding,
        mode,
        created_at,
    };
    Ok(event)
}

pub fn update_form(
    cmd: UpdateFormCommand,
    current_form: &Form,
    _id_gen: &dyn IdGenerator,
    clock: &dyn Clock,
) -> Result<FormUpdated, SondError> {
    if let Some(title) = &cmd.title
        && title.trim().is_empty()
    {
        return Err(SondError::InvalidTitle("Title cannot be empty".to_string()));
    }

    let mut new_question_count = current_form.questions.len();
    if let Some(questions) = &cmd.questions {
        if questions.is_empty() {
            return Err(SondError::InvalidQuestionCount(
                "Form must have at least one question".to_string(),
            ));
        }
        for q in questions {
            q.validate()?;
        }
        new_question_count = questions.len();
    }

    let now = clock.now();
    let updated_at = DateTime::<Utc>::from(now);

    Ok(FormUpdated {
        id: cmd.form_id,
        tenant_id: current_form.tenant_id,
        title: cmd.title,
        description: cmd.description,
        question_count: new_question_count,
        mode: cmd.mode,
        updated_at,
    })
}

pub fn validate_conversational_step(
    form: &Form,
    question_id: Uuid,
    answer: &crate::response::AnswerInput,
) -> Result<(), String> {
    if form.mode != FormMode::Conversational {
        return Err("Form is not in conversational mode".to_string());
    }
    let question = form
        .questions
        .iter()
        .find(|q| q.id == question_id)
        .ok_or_else(|| format!("Question {} not found in form", question_id))?;

    if question.required {
        let is_empty = match &answer.value {
            crate::response::AnswerValue::Text(t) => t.trim().is_empty(),
            crate::response::AnswerValue::Email(e) => e.trim().is_empty(),
            _ => false,
        };
        if is_empty {
            return Err("Answer is required".to_string());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::question::QuestionType;
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

    #[test]
    fn create_form_success() {
        let id_gen = TestIdGenerator;
        let clock = TestClock;
        let cmd = CreateFormCommand {
            tenant_id: TenantId::new(Uuid::new_v4()),
            title: "My Form".to_string(),
            description: Some("Test".to_string()),
            questions: vec![QuestionInput {
                label: "Name".to_string(),
                question_type: QuestionType::Text,
                required: true,
                conditions: vec![],
                page: 1,
            }],
            branding: serde_json::json!({}),
            mode: None,
        };
        let result = create_form(cmd, &id_gen, &clock);
        assert!(result.is_ok());
        let event = result.unwrap();
        assert_eq!(event.title, "My Form");
        assert_eq!(event.question_count, 1);
    }

    #[test]
    fn create_form_empty_title_fails() {
        let id_gen = TestIdGenerator;
        let clock = TestClock;
        let cmd = CreateFormCommand {
            tenant_id: TenantId::new(Uuid::new_v4()),
            title: "   ".to_string(),
            description: None,
            questions: vec![QuestionInput {
                label: "Name".to_string(),
                question_type: QuestionType::Text,
                required: true,
                conditions: vec![],
                page: 1,
            }],
            branding: serde_json::json!({}),
            mode: None,
        };
        let result = create_form(cmd, &id_gen, &clock);
        assert!(matches!(result, Err(SondError::InvalidTitle(_))));
    }

    #[test]
    fn create_form_no_questions_fails() {
        let id_gen = TestIdGenerator;
        let clock = TestClock;
        let cmd = CreateFormCommand {
            tenant_id: TenantId::new(Uuid::new_v4()),
            title: "Form".to_string(),
            description: None,
            questions: vec![],
            branding: serde_json::json!({}),
            mode: None,
        };
        let result = create_form(cmd, &id_gen, &clock);
        assert!(matches!(result, Err(SondError::InvalidQuestionCount(_))));
    }

    #[test]
    fn update_form_success() {
        let id_gen = TestIdGenerator;
        let clock = TestClock;
        let tenant = TenantId::new(Uuid::new_v4());
        let form = Form {
            id: Uuid::new_v4(),
            tenant_id: tenant,
            title: "Old".to_string(),
            description: None,
            questions: vec![],
            branding: serde_json::json!({}),
            mode: FormMode::Standard,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            version: 0,
        };
        let cmd = UpdateFormCommand {
            form_id: form.id,
            title: Some("New Title".to_string()),
            description: Some("New desc".to_string()),
            questions: None,
            mode: None,
            expected_version: 0,
        };
        let result = update_form(cmd, &form, &id_gen, &clock);
        assert!(result.is_ok());
        let event = result.unwrap();
        assert_eq!(event.title, Some("New Title".to_string()));
        assert_eq!(event.description, Some("New desc".to_string()));
        assert_eq!(event.question_count, 0);
    }
}
