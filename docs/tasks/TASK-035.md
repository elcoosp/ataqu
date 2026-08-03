# TASK-035: Frontend SPA — SPARK (Automation)

## Objective
Implement SPARK: workflow list, visual trigger/action/condition builder using React Flow, native outbox event triggers, native actions, execution history, DLQ viewer, test run, enable/disable, scheduling, outbound webhooks, command palette actions, and micro-tour.

## Execution Boundaries
- `apps/spark/src/routes/_auth.index.tsx`
- `apps/spark/src/routes/_auth.workflows.$id.tsx`
- `apps/spark/src/routes/_auth.runs.tsx`
- `apps/spark/src/routes/_auth.dlq.tsx`
- `apps/spark/src/api/`
- `apps/spark/src/components/`
- `apps/spark/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-spark`, `crates/ataqu-application/src/spark_service.rs`, and `crates/ataqu-api/src/handlers/spark.rs`. You MUST read these to derive:*
- **Entity Types**: Map `Workflow`, `Trigger`, `Action`, `Condition`, `WorkflowRun`, `DLQEntry`, `ScheduledTask` structs to TypeScript.
- **API Endpoints**: `GET /workflows`, `POST /workflows`, `PATCH /workflows/:id`, `DELETE /workflows/:id`, `POST /workflows/:id/run`, `GET /workflows/:id/runs`, `GET /dlq`, `POST /dlq/:id/replay`, `DELETE /dlq/:id`, `PATCH /workflows/:id/enable`, `PATCH /workflows/:id/disable`.
- **Native Triggers** (from `ataqu-contracts`): `cinq.deal.won`, `sond.form.submitted`, `vault.stock.below_threshold`, `pause.leave.requested`, `tempo.meeting.no_show`.
- **Native Actions**: `dial.channel.create`, `dial.message.send`, `vault.stock.reserve`, `cinq.activity.create`, `pause.leave.block`, `pivot.task.create`.
- **Conditions**: `field == value`, `field > value`, `field < value`, `field contains value`.
- **Fenced Leases**: Backend uses `UPDATE ... SET fence_token = fence_token + 1` (ADR-020). Frontend doesn't interact with this directly.

## UI Contract

### Shell & Layout
- `<Shell activeApp="spark">`.

### Workflow List (`index.tsx`)
- List of workflows: name, status (active/inactive), last run, trigger type.
- "Create Workflow" button.
- Enable/Disable toggle per workflow. Optimistic UI.
- Empty state: `<EmptyState icon={Zap} title="No workflows" description="Zapier would charge you $30/mo for this. Turn on your first native trigger." ctaLabel="Create Workflow" />`.

### Workflow Builder (`workflows.$id.tsx`)
- Visual canvas using `reactflow` (React Flow).
- Node types: Trigger (green border), Action (blue border), Condition (amber border).
- **Sidebar** (`components/node-sidebar.tsx`): drag nodes onto canvas. `data-tour="trigger-sidebar"` on sidebar.
  - Triggers section: dropdown of available outbox events (from Native Triggers list above).
  - Actions section: dropdown of available native commands.
  - Conditions section: field/operator/value configuration.
- **Canvas** (`components/workflow-canvas.tsx`): `data-tour="canvas"` on canvas container. Connect nodes with edges. Delete nodes/edges.
- **Node Config Panel** (`components/node-config-panel.tsx`): side panel when node selected.
  - Trigger config: select event type, optional filter (e.g., "only deals with amount > 1000").
  - Action config: select action, configure parameters (e.g., channel name pattern, message template).
  - Condition config: field name, operator (==/</>/contains), value.
- **Save**: `PATCH /workflows/:id` with `Idempotency-Key`. Toast: "Workflow saved."
- **Test Run**: button calls `POST /workflows/:id/run` with test payload. Shows result modal: success/failure, output.
- **Enable/Disable**: toggle. `PATCH /workflows/:id/enable` or `/disable`. Optimistic UI.
- **Scheduling**: if trigger type is "schedule", show cron expression input + timezone selector.

### Execution History (`runs.tsx`)
- Table: Workflow, Status (success/failed/running), Started, Duration, Error.
- Click row to see detailed run log (step-by-step execution with timestamps).
- Empty state: "No runs yet. Test your workflow to see execution history."

### DLQ Viewer (`dlq.tsx`)
- Table: Event Type, Payload (truncated), Error, Attempts, Created.
- "Replay" button per entry: `POST /dlq/:id/replay`. Toast: "Event replayed."
- "Delete" button: `DELETE /dlq/:id`. Confirmation modal.
- Empty state: "No dead-letter events. All workflows are healthy."

### Command Palette Actions (`apps/spark/src/actions.ts`)
- `Create Workflow` → opens new workflow
- `Go to Workflows` → navigate to `/`
- `Go to Runs` → navigate to `/runs`
- `Search Workflows` → fuzzy search
- `Run Workflow [Name]` → trigger immediate execution
- `Duplicate Workflow` → only when viewing a workflow
- `Enable Workflow` → only when viewing a workflow
- `Disable Workflow` → only when viewing a workflow
- `Add Trigger` → only when editing a workflow
- `Add Action` → only when editing a workflow
- `Add Condition` → only when editing a workflow
- `Test Run` → only when editing a workflow
- `View DLQ` → navigate to `/dlq`

### Micro-Tour (from `micro-tours.md`)
- Tour ID: `spark-workflow-tour`
- Trigger: First visit to `/workflows/new`.
- Steps:
  1. Target `[data-tour="trigger-sidebar"]` — Content: "Zapier charges per task. We charge $0. Pick a trigger." Action: view.
  2. Target `[data-tour="canvas"]` — Content: "Drag it here. Connect it to an action. You're done." Action: view.

### Toasts
- "Workflow saved." / "Workflow enabled." / "Workflow disabled."
- "Test run completed." / "Test run failed."
- "Event replayed." / "DLQ entry deleted."
- "Workflow duplicated."

### Optimistic UI
- Enable/disable toggle: flips instantly.
- DLQ replay: removes entry from list instantly.
- Save: no visual change except toast.

### Styling
- React Flow custom nodes: `bg-card`, `border-border`, `text-foreground`.
- Trigger nodes: `border-l-4 border-l-green-500`.
- Action nodes: `border-l-4 border-l-blue-500`.
- Condition nodes: `border-l-4 border-l-amber-500`.
- Canvas background: `bg-background` with subtle dot grid.

## Implementation Plan (Development Script)
1. Create types, API client.
2. Create `workflow-canvas.tsx` (React Flow with custom nodes).
3. Create `node-sidebar.tsx` (drag to add, `data-tour="trigger-sidebar"`).
4. Create `node-config-panel.tsx` (trigger/action/condition config).
5. Create `workflow-list.tsx` with enable/disable toggle.
6. Create `execution-history.tsx` (run log table).
7. Create `dlq-viewer.tsx` (replay/delete).
8. Create `test-run-modal.tsx`.
9. Create `apps/spark/src/actions.ts`.
10. Implement routes: index, workflow detail, runs, dlq.
11. Add `data-tour` attributes.
12. Wrap `/workflows/new` with `<OnboardTour>`.
13. Run gates, commit.

## Definition of Done (DoD)
- [ ] React Flow canvas allows adding and connecting nodes.
- [ ] Triggers map exactly to injected Rust event types.
- [ ] Actions map exactly to injected Rust command types.
- [ ] Conditions support ==/>/<contains operators.
- [ ] Workflow saves to backend with `Idempotency-Key`.
- [ ] Test run executes and shows result.
- [ ] Enable/Disable uses optimistic UI.
- [ ] DLQ viewer supports replay and delete.
- [ ] All 13 command palette actions registered.
- [ ] Micro-tour triggers on first visit to `/workflows/new`.
- [ ] All empty states use `<EmptyState>`.
- [ ] All toasts contextual.
- [ ] No `any` types. Gates pass.
