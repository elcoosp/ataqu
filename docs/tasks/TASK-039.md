# TASK-039: Frontend SPA — PAUSE (HR)

## Objective
Implement PAUSE: employee directory (searchable), leave requests (request/approve/reject), approval workflow, documents (contracts/payslips), onboarding workflow, reporting (headcount), EmployeeCreatedV1 event awareness (for CINQ projection), command palette actions.

## Execution Boundaries
- `apps/pause/src/routes/_auth.directory.tsx`
- `apps/pause/src/routes/_auth.employees.$id.tsx`
- `apps/pause/src/routes/_auth.leave.tsx`
- `apps/pause/src/routes/_auth.onboarding.tsx`
- `apps/pause/src/routes/_auth.reports.tsx`
- `apps/pause/src/api/`
- `apps/pause/src/components/`
- `apps/pause/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-pause`, `crates/ataqu-application/src/pause_service.rs`, and `crates/ataqu-api/src/handlers/pause.rs`. You MUST read these to derive:*
- **Entity Types**: Map `Employee`, `LeaveRequest`, `LeaveBalance`, `Document`, `OnboardingTask` structs to TypeScript.
- **API Endpoints**: `GET /employees`, `POST /employees`, `GET /employees/:id`, `PATCH /employees/:id`, `GET /employees/search?q=`, `POST /leave-requests`, `GET /leave-requests`, `PATCH /leave-requests/:id/approve`, `PATCH /leave-requests/:id/reject`, `GET /employees/:id/documents`, `POST /employees/:id/documents`, `GET /employees/:id/onboarding`, `PATCH /employees/:id/onboarding/:taskId`, `GET /reports/headcount`.
- **EmployeeCreatedV1**: Backend emits this event to outbox on employee creation. CINQ consumes to auto-create contact. No frontend action needed — just be aware the backend handles it.
- **PII**: Employee email and phone are API-serialized strings on frontend. Backend redacts in logs.

## UI Contract

### Shell & Layout
- `<Shell activeApp="pause">`.

### Employee Directory (`directory.tsx`)
- Searchable list/grid of employees. Search bar: debounced, calls `GET /employees/search?q=`.
- Employee card: name, role, email, avatar (square initials), department.
- "Add Employee" button opens modal: name, email, role, hire date, department.
- Empty state: `<EmptyState icon={Users} title="No employees" description="Add your first employee to get started." ctaLabel="Add Employee" />`.

### Employee Detail (`employees.$id.tsx`)
- Header: name, role, email, phone, hire date, department.
- Tabs: Leave Balance, Documents, Onboarding.
- **Leave Balance**: show accrued, used, remaining. Request leave button.
- **Documents**: list of documents (contracts, payslips). "Upload Document" button. File upload via presigned URL.
- **Onboarding**: checklist of onboarding tasks (if employee is new). Checkbox to complete. Progress bar.

### Leave Requests (`leave.tsx`)
- **For employees**: "Request Leave" button opens modal: start date, end date, type (vacation/sick/personal), reason. React Hook Form + Zod validation (prevent invalid date ranges).
- **For managers**: Approval dashboard. Table: employee, dates, type, reason, status. "Approve" and "Reject" buttons. Optimistic UI: button disables instantly, status changes.
- `data-tour="request-leave"` on request button. `data-tour="pending-list"` on pending list.
- Empty state: `<EmptyState icon={CalendarOff} title="No leave requests" description="Request time off or review pending approvals." />`.

### Onboarding (`onboarding.tsx`)
- List of new hires with onboarding progress.
- Checklist template: create account, sign contract, setup workspace, assign mentor.
- Checkbox to complete each task. Progress bar per employee.
- Empty state: "No active onboarding. New hires will appear here."

### Reports (`reports.tsx`)
- Headcount by department (bar chart using Recharts).
- Headcount trend over time (line chart).
- Turnover rate (number).
- Leave usage summary (pie chart by type).
- Empty state: "No data yet. Add employees to see reports."

### Command Palette Actions (`apps/pause/src/actions.ts`)
- `Add Employee` → opens employee creation modal
- `Go to Directory` → navigate to `/directory`
- `Go to Leave` → navigate to `/leave`
- `Go to Onboarding` → navigate to `/onboarding`
- `Search Employees` → focuses directory search
- `Request Leave` → opens leave request modal
- `Approve Leave` → only when viewing a leave request
- `Reject Leave` → only when viewing a leave request
- `Upload Document` → only when viewing an employee

### Micro-Tour (from `micro-tours.md`)
- Tour ID: `pause-leave-tour`
- Trigger: First visit to `/leave`.
- Steps:
  1. Target `[data-tour="request-leave"]` — Content: "No payroll bloat. Just leave tracking." Action: click.
  2. Target `[data-tour="pending-list"]` — Content: "Approve here, and their system access updates automatically via AEGIS." Action: view.

### Toasts
- "Employee added." / "Leave requested." / "Leave approved." / "Leave rejected."
- "Document uploaded." / "Onboarding task completed."
- "Employee offboarded. AEGIS access revoked." (when offboarding)

### Optimistic UI
- Leave approve/reject: button disables instantly, status changes.
- Onboarding task: checkbox toggles instantly.
- Employee add: appears in directory instantly.

### Styling
- Dark-mode native.
- Leave status badges: pending = amber, approved = green, rejected = red.
- Progress bars: `bg-primary`.
- Charts: Recharts with amber primary color.

## Implementation Plan (Development Script)
1. Create types, API client.
2. Create `employee-directory.tsx` (searchable, grid/list).
3. Create `employee-detail.tsx` (tabs: leave, documents, onboarding).
4. Create `leave-request-form.tsx` (React Hook Form + Zod).
5. Create `approval-dashboard.tsx` (table, approve/reject, optimistic).
6. Create `onboarding-checklist.tsx` (progress bar, checkboxes).
7. Create `document-upload.tsx` (presigned URL).
8. Create `reports.tsx` (Recharts: headcount, turnover, leave).
9. Create `apps/pause/src/actions.ts`.
10. Implement routes: directory, employee detail, leave, onboarding, reports.
11. Add `data-tour` attributes.
12. Wrap `/leave` with `<OnboardTour>`.
13. Run gates, commit.

## Definition of Done (DoD)
- [ ] Directory search works with debounced input.
- [ ] Zod validation prevents invalid date ranges for leave.
- [ ] Approve/Reject uses optimistic UI.
- [ ] Onboarding checklist with progress bar.
- [ ] Document upload via presigned URL.
- [ ] Reports render with Recharts (headcount, turnover, leave).
- [ ] All 9 command palette actions registered.
- [ ] Micro-tour triggers on first visit to `/leave`.
- [ ] All empty states use `<EmptyState>`.
- [ ] All toasts contextual.
- [ ] All mutations include `Idempotency-Key`.
- [ ] No `any` types. Gates pass.
