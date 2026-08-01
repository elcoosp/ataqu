use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug, Clone, PartialEq)]
pub enum SondError {
    #[error("Invalid title: {0}")]
    InvalidTitle(String),
    #[error("Invalid question count: {0}")]
    InvalidQuestionCount(String),
    #[error("Invalid question label: {0}")]
    InvalidQuestionLabel(String),
    #[error("Invalid question options: {0}")]
    InvalidQuestionOptions(String),
    #[error("Invalid rating range: {0}")]
    InvalidRatingRange(String),
    #[error("Invalid choice value: {0}")]
    InvalidChoiceValue(String),
    #[error("Invalid rating value: {0}")]
    InvalidRatingValue(u8),
    #[error("Type mismatch between answer and question")]
    TypeMismatch,
    #[error("Question not found: {0}")]
    QuestionNotFound(Uuid),
    #[error("Missing required answer for question: {0}")]
    MissingRequiredAnswer(Uuid),
    #[error("Condition evaluation error: {0}")]
    ConditionError(String),
    #[error("Repository error: {0}")]
    Repository(String),
}
