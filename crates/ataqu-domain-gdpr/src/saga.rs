use crate::{GdprSaga, GdprStep};
use std::time::SystemTime;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SagaError {
    StepFailed,
    MaxRetriesExceeded,
    AlreadyComplete,
}

pub type SagaResult<T> = Result<T, SagaError>;

/// Transition a saga to the next step based on the result.
/// Returns `true` if the saga is complete.
pub fn transition_saga(saga: &mut GdprSaga, result: Result<(), String>) -> SagaResult<bool> {
    if saga.is_complete() {
        return Err(SagaError::AlreadyComplete);
    }
    const MAX_RETRIES: u32 = 3;
    match result {
        Ok(()) => {
            // If we are at PurgeTables, completion is the next state
            if saga.step == GdprStep::PurgeTables {
                saga.step = GdprStep::Complete;
                saga.retry_count = 0;
                saga.updated_at = SystemTime::now();
                return Ok(true);
            }
            if let Some(next_step) = saga.step.next() {
                saga.step = next_step;
                saga.retry_count = 0;
                saga.updated_at = SystemTime::now();
                Ok(false)
            } else {
                // Should not happen for non-complete steps, but fallback
                saga.step = GdprStep::Complete;
                saga.updated_at = SystemTime::now();
                Ok(true)
            }
        }
        Err(_) => {
            saga.retry_count += 1;
            saga.updated_at = SystemTime::now();
            if saga.retry_count >= MAX_RETRIES {
                Err(SagaError::MaxRetriesExceeded)
            } else {
                Err(SagaError::StepFailed)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{GdprSaga, GdprStep};
    use uuid::Uuid;

    #[test]
    fn test_saga_transition_success() {
        let mut saga = GdprSaga::new(Uuid::new_v4(), Uuid::new_v4());
        assert_eq!(saga.step, GdprStep::DeactivateUsers);
        let result = transition_saga(&mut saga, Ok(()));
        assert!(result.is_ok());
        assert_eq!(saga.step, GdprStep::AnonymizePII);
        assert_eq!(saga.retry_count, 0);
    }

    #[test]
    fn test_saga_transition_failure_retry() {
        let mut saga = GdprSaga::new(Uuid::new_v4(), Uuid::new_v4());
        let result = transition_saga(&mut saga, Err("error".to_string()));
        assert!(matches!(result, Err(SagaError::StepFailed)));
        assert_eq!(saga.retry_count, 1);
        assert_eq!(saga.step, GdprStep::DeactivateUsers);
    }

    #[test]
    fn test_saga_transition_max_retries() {
        let mut saga = GdprSaga::new(Uuid::new_v4(), Uuid::new_v4());
        for _ in 0..3 {
            let _ = transition_saga(&mut saga, Err("error".to_string()));
        }
        let result = transition_saga(&mut saga, Err("error".to_string()));
        assert!(matches!(result, Err(SagaError::MaxRetriesExceeded)));
        assert_eq!(saga.retry_count, 4);
    }

    #[test]
    fn test_saga_complete() {
        let mut saga = GdprSaga::new(Uuid::new_v4(), Uuid::new_v4());
        let steps = [
            GdprStep::DeactivateUsers,
            GdprStep::AnonymizePII,
            GdprStep::DeleteS3Files,
            GdprStep::PurgeTables,
        ];
        // Transition through the first three steps, each returns Ok(false) except the last
        for step in steps.iter().take(3) {
            let result = transition_saga(&mut saga, Ok(()));
            assert!(result.is_ok());
            assert!(!result.unwrap()); // not complete
            assert_eq!(&saga.step, step.next().as_ref().unwrap());
        }
        // Transition from PurgeTables should complete
        let result = transition_saga(&mut saga, Ok(()));
        assert!(result.is_ok());
        assert!(result.unwrap()); // complete
        assert_eq!(saga.step, GdprStep::Complete);
    }
}
