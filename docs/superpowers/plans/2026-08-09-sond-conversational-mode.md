# SOND Conversational Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggle in the SOND form builder to switch from standard (all questions on one page) to conversational (one question per slide) mode, and update the public submission endpoint to validate answers step-by-step.

**Architecture:** Add a `mode` enum to the `Form` entity. The public form submission endpoint will accept a single question's answer, validate it against the form definition, and return the next question or a completion status.

**Tech Stack:** Rust, SeaORM, Axum.

---

## File Structure
- **Modify:** `crates/ataqu-domain-sond/src/form.rs`
- **Modify:** `crates/ataqu-application/src/sond_service.rs`
- **Modify:** `crates/ataqu-api/src/handlers/sond.rs`

---

### Task 1: Domain Entity Update

**Files:**
- Modify: `crates/ataqu-domain-sond/src/form.rs`

- [ ] **Step 1: Write the failing test**

```rust
// In crates/ataqu-domain-sond/src/form.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn form_mode_serializes_correctly() {
        let standard = FormMode::Standard;
        assert_eq!(serde_json::to_string(&standard).unwrap(), "\"standard\"");

        let conversational = FormMode::Conversational;
        assert_eq!(serde_json::to_string(&conversational).unwrap(), "\"conversational\"");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo nextest run -p ataqu-domain-sond form_mode_serializes_correctly`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```rust
// Add to crates/ataqu-domain-sond/src/form.rs
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FormMode {
    Standard,
    Conversational,
}

impl Default for FormMode {
    fn default() -> Self {
        Self::Standard
    }
}

// Add `pub mode: FormMode` to the `Form` struct
// Add `pub mode: FormMode` to the `CreateFormCommand` struct
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-domain-sond form_mode_serializes_correctly`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/ataqu-domain-sond/src/form.rs
git commit -m "feat(sond): add FormMode enum to domain entity"
```

---

### Task 2: Step-by-Step Validation in Application Service

**Files:**
- Modify: `crates/ataqu-application/src/sond_service.rs`

- [ ] **Step 1: Write the failing test**

```rust
// In crates/ataqu-application/src/sond_service.rs
#[cfg(test)]
mod tests {
    use super::*;
    use mockall::mock;
    use async_trait::async_trait;

    mock! {
        SondRepo {}
        #[async_trait]
        pub trait SondRepository: Send + Sync {
            async fn save_form(&self, form: &Form) -> Result<(), String>;
            async fn get_form(&self, tenant_id: TenantId, form_id: Uuid) -> Result<Option<Form>, String>;
            async fn get_form_by_id(&self, form_id: Uuid) -> Result<Option<Form>, String>;
            async fn save_response(&self, response: &Response) -> Result<(), String>;
            async fn list_forms(&self, tenant_id: &TenantId, limit: u64, offset: u64) -> Result<Vec<Form>, String>;
            async fn delete_form(&self, tenant_id: TenantId, form_id: Uuid) -> Result<(), String>;
            async fn list_responses(&self, tenant_id: &TenantId, form_id: Uuid, limit: u64, offset: u64) -> Result<Vec<Response>, String>;
        }
    }

    #[tokio::test]
    async fn test_validate_single_answer_conversational() {
        let mut mock_repo = MockSondRepo::new();
        mock_repo.expect_get_form_by_id().returning(|_| {
            Ok(Some(Form {
                id: Uuid::new_v4(),
                tenant_id: TenantId::new(Uuid::new_v4()),
                title: "Test".to_string(),
                description: None,
                questions: vec![Question { id: Uuid::new_v4(), label: "Q1".to_string(), required: true, question_type: QuestionType::Text, conditions: vec![], page: 0 }, Question { id: Uuid::new_v4(), label: "Q2".to_string(), required: true, question_type: QuestionType::Text, conditions: vec![], page: 1 }],
                branding: serde_json::Value::Null,
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
                version: 0,
                mode: FormMode::Conversational,
            }))
        });

        let service = SondService::new(Arc::new(mock_repo), Arc::new(MockOutbox {}), Arc::new(MockIdGen {}), Arc::new(MockClock {}));

        let q1_id = Uuid::new_v4();
        let result = service.submit_conversational_answer(TenantId::new(Uuid::new_v4()), Uuid::new_v4(), q1_id, AnswerInput { question_id: q1_id, value: AnswerValue::Text("Answer".to_string()) }).await;
        assert!(result.is_ok());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo nextest run -p ataqu-application test_validate_single_answer_conversational`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```rust
// In crates/ataqu-application/src/sond_service.rs
pub struct ConversationalStepResult {
    pub is_complete: bool,
    pub next_question_id: Option<Uuid>,
}

pub async fn submit_conversational_answer(
    &self,
    tenant_id: TenantId,
    form_id: Uuid,
    question_id: Uuid,
    answer: ataqu_domain_sond::response::AnswerInput,
) -> SondResult<ConversationalStepResult> {
    let form = self.repo.get_form_by_id(form_id).await?.ok_or(SondServiceError::FormNotFound)?;

    let _ = ataqu_domain_sond::response::validate_answers(&[answer], &form.questions)?;

    let current_idx = form.questions.iter().position(|q| q.id == question_id)
        .ok_or(SondServiceError::Validation("Invalid question_id".to_string()))?;

    let next_question = form.questions.get(current_idx + 1);

    Ok(ConversationalStepResult {
        is_complete: next_question.is_none(),
        next_question_id: next_question.map(|q| q.id),
    })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo nextest run -p ataqu-application test_validate_single_answer_conversational`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add crates/ataqu-application/src/sond_service.rs
git commit -m "feat(sond): add conversational step validation to service"
```

---

### Task 3: Public API Endpoint for Conversational Step

**Files:**
- Modify: `crates/ataqu-api/src/handlers/sond.rs`

- [ ] **Step 1: Write minimal implementation**

```rust
// In crates/ataqu-api/src/handlers/sond.rs
#[derive(Debug, Deserialize)]
pub struct ConversationalStepRequest {
    pub question_id: Uuid,
    pub answer: ataqu_domain_sond::response::AnswerInput,
}

pub async fn submit_conversational_step(
    State(state): State<AppState>,
    Path(form_id): Path<Uuid>,
    Json(payload): Json<ConversationalStepRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let form = state.sond_service.get_form_public(form_id).await
        .map_err(|e| ApiResponseError::not_found(&e.to_string()))?;

    if form.mode != ataqu_domain_sond::form::FormMode::Conversational {
        return Err(ApiResponseError::validation("Form is not in conversational mode"));
    }

    let result = state.sond_service.submit_conversational_answer(
        form.tenant_id,
        form_id,
        payload.question_id,
        payload.answer,
    ).await.map_err(|e| ApiResponseError::internal(&e.to_string()))?;

    Ok(Json(serde_json::json!({
        "is_complete": result.is_complete,
        "next_question_id": result.next_question_id
    })))
}
```
*Add route to `public_routes()`:* `.route("/forms/:id/submit/step", axum::routing::post(submit_conversational_step))`

- [ ] **Step 2: Run check to verify it compiles**

Run: `cargo check -p ataqu-api`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add crates/ataqu-api/src/handlers/sond.rs
git commit -m "feat(api): add conversational step endpoint for SOND"
```
