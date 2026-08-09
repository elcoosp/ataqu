# TASK-076: SOND Conversational Mode

## Objective
Add a toggle in the SOND form builder to switch from standard (all questions on one page) to conversational (one question per slide) mode, and update the public submission endpoint to validate answers step‑by‑step.

## Execution Boundaries
- `crates/ataqu-domain-sond/src/form.rs` (modify)
- `crates/ataqu-application/src/sond_service.rs` (modify)
- `crates/ataqu-api/src/handlers/sond.rs` (modify)

## Step-by-Step Implementation Details

1. **Update domain entity**
   Add `FormMode` enum (`Standard`, `Conversational`) with `serde` serialisation. Add `mode` field to `Form` and `CreateFormCommand`.

2. **Add step‑by‑step validation in application service**
   Create `submit_conversational_answer(tenant_id, form_id, question_id, answer)` that validates the answer and returns `ConversationalStepResult { is_complete, next_question_id }`.

3. **Add public API endpoint**
   `POST /api/v1/sond/forms/:id/submit/step` that accepts `{ question_id, answer }` and returns `{ is_complete, next_question_id }`. Reject if form is not in conversational mode.

## Success Criteria & Verification
- [ ] Domain enum serialises correctly.
- [ ] Service method returns correct next question or completion.
- [ ] Public endpoint handles validation and returns appropriate errors.
- [ ] `cargo test -p ataqu-domain-sond` passes.
- [ ] `cargo test -p ataqu-application` passes.
