# TASK-037: Frontend SPA — SOND (Forms)

## Objective
Implement SOND: visual drag-and-drop form builder, question types (text, email, choice, date), conditional logic (branching), submissions table, CSV export, branding (colors, logo), email notifications, webhooks to CINQ and SPARK (via outbox), multi-question pages, command palette actions.

## Execution Boundaries
- `apps/sond/src/routes/_auth.index.tsx`
- `apps/sond/src/routes/_auth.builder.$id.tsx`
- `apps/sond/src/routes/_auth.submissions.$id.tsx`
- `apps/sond/src/api/`
- `apps/sond/src/components/`
- `apps/sond/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-sond`, `crates/ataqu-application/src/sond_service.rs`, and `crates/ataqu-api/src/handlers/sond.rs`. You MUST read these to derive:*
- **Entity Types**: Map `Form`, `Question`, `QuestionOption`, `Submission`, `ConditionalRule` structs to TypeScript.
- **API Endpoints**: `GET /forms`, `POST /forms`, `PATCH /forms/:id`, `GET /forms/:id`, `POST /forms/:id/publish`, `GET /forms/:id/submissions`, `GET /forms/:id/submissions/export`, `POST /forms/:id/submissions` (public), `POST /integrations/toggle`.
- **Conditional Logic**: Backend stores `ConditionalRule { questionId, operator, value, action: "show" | "hide", targetQuestionId }`.
- **Batch Ingestion**: Backend uses `transactional_batch_insert` for large submission batches.
- **Webhooks/Integrations**: Form submit emits `SondFormSubmittedV1` to outbox. CINQ consumes to create lead. SPARK consumes to trigger workflow. Frontend integration toggle enables/disables this.

## UI Contract

### Shell & Layout
- `<Shell activeApp="sond">`.

### Form List (`index.tsx`)
- Grid of form cards: name, submission count, status (draft/published), last submission.
- "Create Form" button.
- Empty state: `<EmptyState icon={ClipboardList} title="No forms" description="Create one to start collecting responses. No response limits." ctaLabel="Create Form" />`.

### Form Builder (`builder.$id.tsx`)
- Three-panel layout: Left = question types palette, Center = form canvas, Right = question config.
- **Question Types Palette** (drag-and-drop using `@dnd-kit/core`): Text, Email, Choice (single/multiple), Date, Rating, Phone.
- **Form Canvas**: drop zone. Questions displayed in order. Drag to reorder. Click to select.
- **Question Config Panel** (right side): question text, required toggle, help text, choices (for choice type), date format (for date type).
- **Conditional Logic**: "Add Conditional Logic" button opens modal: If [Question] [==/!=] [Value], then [Show/Hide] [Target Question].
- **Multi-Question Pages**: "Add Page Break" button. Questions grouped into pages. Page navigation in preview.
- **Branding**: "Branding" tab: primary color picker, logo upload, font selector (Inter/JetBrains Mono).
- **Publish**: "Publish Form" button. `POST /forms/:id/publish` with `Idempotency-Key`. Generates public URL.
- **Preview**: "Preview" button opens modal with interactive form preview.

### Submissions (`submissions.$id.tsx`)
- `@ataqu/ui` `Table`: submission date, answers (first 3 columns), status.
- Click row to see full submission detail.
- "Export CSV" button: `GET /forms/:id/submissions/export`. Downloads blob.
- **Integration Toggles**:
  - `<Switch>` labeled "Create CINQ lead on submission." `POST /integrations/toggle` with `{ sourceApp: "sond", targetApp: "cinq", entityId: form.id, enabled }`. Badge: "Connected to CINQ".
  - `<Switch>` labeled "Trigger SPARK workflow on submission." Same pattern. Badge: "Connected to SPARK".
- Empty state: `<EmptyState icon={Inbox} title="No submissions yet" description="Publish your form to start collecting responses." />`.

### Command Palette Actions (`apps/sond/src/actions.ts`)
- `Create Form` → opens form builder
- `Go to Forms` → navigate to `/`
- `Go to Submissions` → navigate to submissions for current form
- `Search Forms` → fuzzy search
- `Add Question` → only when editing a form
- `Add Conditional Logic` → only when editing a form
- `Publish Form` → only when editing a form
- `Export Submissions CSV` → only when viewing submissions
- `Connect to SPARK` → only when viewing a form
- `Connect to CINQ` → only when viewing a form

### Toasts
- "Form created." / "Form published." / "Question added."
- "Conditional logic saved." / "Submissions exported."
- "SOND connected to CINQ." / "SOND connected to SPARK."

### Optimistic UI
- Question add: appears in canvas instantly.
- Reorder: positions update instantly.
- Publish: status badge changes instantly.
- Integration toggle: switch flips instantly.

### Styling
- Dark-mode native.
- Form canvas: `bg-background`. Selected question: `border-l-4 border-l-primary`.
- Preview modal: `bg-card`, centered, `max-w-lg`.

## Implementation Plan (Development Script)
1. Create types, API client.
2. Create `form-builder.tsx` (three-panel, `@dnd-kit/core` drag-and-drop).
3. Create `question-palette.tsx` (text, email, choice, date, rating, phone).
4. Create `question-config-panel.tsx` (text, required, help, choices, conditional logic).
5. Create `conditional-logic-modal.tsx`.
6. Create `branding-tab.tsx` (color, logo, font).
7. Create `form-preview.tsx` (interactive modal).
8. Create `submissions-table.tsx` with CSV export.
9. Create `integration-toggle.tsx` (CINQ + SPARK).
10. Create `apps/sond/src/actions.ts`.
11. Implement routes: index, builder, submissions.
12. Run gates, commit.

## Definition of Done (DoD)
- [ ] Drag-and-drop builder works to add and reorder questions.
- [ ] All 6 question types render and configure correctly.
- [ ] Conditional logic (show/hide) works in preview.
- [ ] Multi-question pages work.
- [ ] Branding (color, logo, font) applies to preview.
- [ ] Form publishing generates public URL.
- [ ] Submissions table renders data.
- [ ] CSV export downloads a file.
- [ ] Integration toggles call correct endpoint, show badges.
- [ ] All 10 command palette actions registered.
- [ ] All empty states use `<EmptyState>`.
- [ ] All toasts contextual.
- [ ] All mutations include `Idempotency-Key`.
- [ ] No `any` types. Gates pass.
