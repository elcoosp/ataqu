# @ataqu/ui

Shared UI components, layouts, and the unified Shell.

## Components

- `Shell` – the global shell with sidebar, header, and command palette.
- `CommandPalette` – ⌘K search and navigation.
- `OnboardTour` – micro-tours for onboarding.
- Layouts: `PageLayout`, `DashboardLayout`, `AuthLayout`.
- Data components: `DataTable`, `KanbanBoard`, `FormBuilder`, `WorkflowCanvas`, `Chart`.

## Usage

```tsx
import { Shell } from '@ataqu/ui';
<Shell activeApp="cinq">
  <div>Your app content</div>
</Shell>
```
