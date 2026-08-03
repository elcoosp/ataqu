Here is a comprehensive, research-backed brainstorm for your command palette actions. I analyzed how the best-in-class SaaS products (Linear, Notion, Slack, Superhuman, Vercel, GitHub) design their command palettes, then mapped those patterns to your 10 apps.

---

## 🔬 Research Synthesis: What the Best Do

**Linear** lets you create issues, switch views, change settings, navigate to projects, and execute virtually any action – all from `⌘K`. It's context-aware: when viewing an issue, `⌘K` shows actions applicable to that issue (e.g., "copy issue in markdown").

**Notion** uses `⌘P` (or `⌘K`) to create new pages, change block types, add templates, insert dates, and search across everything. The palette treats **creation** and **navigation** as first-class citizens.

**Slack** uses `⌘K` as a **Quick Switcher** – type a channel or person's name to jump there instantly. It also supports slash commands (`/`) for actions like `/invite` or `/remind`.

**Superhuman** (the email client built around keyboard shortcuts) treats the palette as the primary interface – archive, pin, snooze, schedule, all from `⌘K`.

**The Core Pattern:** A great command palette is **three things in one**: places you can go, actions you can take, and objects you can find. It should be **context-aware** – surfacing relevant actions based on the current view – and **show keyboard shortcuts** next to commands to teach power users.

---

## 📋 Action Items by App

### Global / OS-Level (Available Everywhere)

| Action | Description | Keyboard Shortcut (if applicable) |
|--------|-------------|-----------------------------------|
| `Go to [App]` | Switch to any of the 10 apps (CINQ, DIAL, PIVOT, etc.) | `⌘1` – `⌘0` |
| `Go to Settings` | Open global settings | — |
| `Go to Billing` | Open billing/subscription page | — |
| `Go to Stack Audit` | Open `/audit` dashboard | — |
| `Toggle Theme` | Switch between dark/light mode | — |
| `Sign Out` | Log out of the current session | — |
| `Search Everything` | Global search across all apps (if implemented) | — |
| `Show Keyboard Shortcuts` | Display a cheat sheet of all shortcuts | `?` |

**Research Note:** `⌘K` should both open and close the palette, restoring previous focus. Pressing `?` should show a shortcut reference.

---

### AEGIS (SSO & Security)

| Action | Description | Context |
|--------|-------------|---------|
| `Invite User` | Open the user invitation modal | Anywhere |
| `Go to Users` | Navigate to `/admin/users` | Anywhere |
| `Go to Roles` | Navigate to `/admin/roles` | Anywhere |
| `Go to API Keys` | Navigate to `/admin/api-keys` | Anywhere |
| `Create API Key` | Generate a new API key | Anywhere |
| `Revoke [User] Access` | Immediately revoke a user's access | When a user is selected |

---

### CINQ (CRM)

| Action | Description | Context |
|--------|-------------|---------|
| `Create Contact` | Open the new contact modal | Anywhere in CINQ |
| `Create Deal` | Open the new deal modal | Anywhere in CINQ |
| `Go to Contacts` | Navigate to `/contacts` | Anywhere |
| `Go to Deals` | Navigate to `/deals` (Kanban) | Anywhere |
| `Go to Tasks` | Navigate to `/tasks` | Anywhere |
| `Go to Import` | Navigate to `/import` | Anywhere |
| `Import CSV` | Trigger CSV import from clipboard or file picker | Anywhere |
| `Search Contacts` | Focus search bar in contacts view | When on `/contacts` |
| `Search Deals` | Focus search bar in deals view | When on `/deals` |
| `Move Deal to [Stage]` | Move the current deal to a pipeline stage | When viewing a deal (`/deals/:id`) |
| `Add Activity` | Add a note, call, or email to the current contact/deal | When viewing a contact or deal |
| `Connect to DIAL` | Enable native integration: deal won → DIAL channel | When viewing a deal |
| `Connect to SPARK` | Enable native integration: deal won → trigger workflow | When viewing a deal |
| `Export Contacts CSV` | Download all contacts as CSV | When on `/contacts` |
| `Export Deals CSV` | Download all deals as CSV | When on `/deals` |

**Research Note:** In Linear, `C` creates a new issue. Consider `C` for "Create Contact" and `D` for "Create Deal" when in CINQ.

---

### DIAL (Chat & Support)

| Action | Description | Context |
|--------|-------------|---------|
| `Go to [Channel]` | Jump to a specific channel (fuzzy search) | Anywhere in DIAL |
| `Go to [DM]` | Jump to a direct message with a specific user | Anywhere |
| `Create Channel` | Open the new channel modal | Anywhere |
| `Create Private Channel` | Open the new private channel modal | Anywhere |
| `Go to Threads` | Navigate to threads view | Anywhere |
| `Go to Tickets` | Navigate to support tickets (`/tickets`) | Anywhere |
| `Go to Files` | Navigate to file gallery (`/files`) | Anywhere |
| `Search Messages` | Focus global search | Anywhere |
| `@[User]` | Mention a user in the current channel | When typing in a channel |
| `#[Channel]` | Link to another channel | When typing |
| `Toggle Focus Mode` | Mute non-mention notifications | Anywhere |
| `Mark All Read` | Mark all messages in the current channel as read | When in a channel |
| `Set Status` | Set presence status (Online/Away/Offline) | Anywhere |
| `Connect to CINQ` | Enable native integration: show deal context in sidebar | Anywhere |

**Research Note:** Slack's `⌘K` Quick Switcher is purely for navigation. Your DIAL palette should also include **actions** like creating channels and toggling focus mode.

---

### PIVOT (Docs & Databases)

| Action | Description | Context |
|--------|-------------|---------|
| `Create Document` | Open a new document | Anywhere in PIVOT |
| `Create Database` | Open a new database view | Anywhere |
| `Go to [Document]` | Jump to a specific document (fuzzy search) | Anywhere |
| `Go to [Database]` | Jump to a specific database | Anywhere |
| `Go to Templates` | Navigate to `/templates` | Anywhere |
| `Search Documents` | Focus global search | Anywhere |
| `Link to CINQ Deal` | Link the current document to a CINQ deal | When viewing a document |
| `Link to VAULT Product` | Link the current document to a VAULT product | When viewing a document |
| `Insert [Block Type]` | Insert a heading, table, code block, etc. | When editing a document |
| `Toggle Version History` | Open the version history for the current document | When viewing a document |
| `Export Markdown` | Download the current document as Markdown | When viewing a document |
| `Duplicate Document` | Create a copy of the current document | When viewing a document |

**Research Note:** Notion's palette lets you change block types and insert templates. PIVOT should support `/` slash commands inline for block insertion, with `⌘K` for document-level actions.

---

### SPARK (Automation)

| Action | Description | Context |
|--------|-------------|---------|
| `Create Workflow` | Open the workflow builder | Anywhere in SPARK |
| `Go to Workflows` | Navigate to workflow list (`/`) | Anywhere |
| `Go to Runs` | Navigate to execution history (`/runs`) | Anywhere |
| `Search Workflows` | Fuzzy search existing workflows | Anywhere |
| `Run Workflow [Name]` | Trigger a workflow immediately | Anywhere |
| `Duplicate Workflow` | Copy an existing workflow | When viewing a workflow |
| `Enable Workflow` | Activate a workflow | When viewing a workflow |
| `Disable Workflow` | Deactivate a workflow | When viewing a workflow |
| `Add Trigger` | Add a trigger node to the current workflow | When editing a workflow |
| `Add Action` | Add an action node to the current workflow | When editing a workflow |
| `Add Condition` | Add a condition node to the current workflow | When editing a workflow |
| `Test Run` | Execute a test run of the current workflow | When editing a workflow |
| `View DLQ` | Navigate to dead-letter queue for failed runs | Anywhere |

**Research Note:** Zapier doesn't have a strong command palette – this is a competitive advantage. Make SPARK keyboard-first.

---

### TEMPO (Scheduling)

| Action | Description | Context |
|--------|-------------|---------|
| `Create Event Type` | Open the new event type modal | Anywhere in TEMPO |
| `Go to Event Types` | Navigate to `/event-types` | Anywhere |
| `Go to Meetings` | Navigate to upcoming meetings (`/`) | Anywhere |
| `Go to Calendar Settings` | Navigate to `/settings/calendars` | Anywhere |
| `Connect Google Calendar` | Initiate OAuth flow for Google | Anywhere |
| `Connect Outlook Calendar` | Initiate OAuth flow for Outlook | Anywhere |
| `Create Booking Link` | Generate a new public booking URL | Anywhere |
| `Search Meetings` | Search past/upcoming meetings | Anywhere |
| `Cancel Meeting` | Cancel the current meeting | When viewing a meeting (`/meetings/:id`) |
| `Reschedule Meeting` | Open reschedule modal | When viewing a meeting |

---

### SOND (Forms & Surveys)

| Action | Description | Context |
|--------|-------------|---------|
| `Create Form` | Open the form builder (`/builder/new`) | Anywhere in SOND |
| `Go to Forms` | Navigate to form list (`/`) | Anywhere |
| `Go to Submissions` | Navigate to submissions for the current form | When viewing a form |
| `Search Forms` | Fuzzy search existing forms | Anywhere |
| `Add Question` | Add a question to the current form | When editing a form (`/builder/:id`) |
| `Add Conditional Logic` | Open the logic editor | When editing a form |
| `Publish Form` | Publish the current form | When editing a form |
| `Export Submissions CSV` | Download submissions as CSV | When viewing submissions |
| `Connect to SPARK` | Enable native integration: form submit → trigger workflow | When viewing a form |
| `Connect to CINQ` | Enable native integration: form submit → create lead | When viewing a form |

---

### VAULT (Inventory)

| Action | Description | Context |
|--------|-------------|---------|
| `Create Product` | Open the new product modal | Anywhere in VAULT |
| `Create Variant` | Open the new variant modal | When viewing a product |
| `Go to Products` | Navigate to `/products` | Anywhere |
| `Go to Movements` | Navigate to `/movements` | Anywhere |
| `Go to Warehouses` | Navigate to `/warehouses` | Anywhere |
| `Go to Reservations` | Navigate to `/reservations` | Anywhere |
| `Search Products` | Focus product search | When on `/products` |
| `Adjust Stock` | Open stock adjustment modal for the current product | When viewing a product (`/products/:id`) |
| `Set Low Stock Alert` | Configure low stock threshold | When viewing a product |
| `Reserve Stock for Deal [ID]` | Manually reserve stock for a CINQ deal | Anywhere |
| `Connect to CINQ` | Enable native integration: deal won → reserve stock | Anywhere |
| `Export Products CSV` | Download products as CSV | When on `/products` |
| `Sync Shopify` | Trigger Shopify channel sync | Anywhere |

---

### PAUSE (HR)

| Action | Description | Context |
|--------|-------------|---------|
| `Add Employee` | Open the new employee modal | Anywhere in PAUSE |
| `Go to Directory` | Navigate to `/directory` | Anywhere |
| `Go to Leave` | Navigate to leave requests (`/leave`) | Anywhere |
| `Go to Onboarding` | Navigate to onboarding (`/onboarding`) | Anywhere |
| `Search Employees` | Focus employee search | When on `/directory` |
| `Request Leave` | Open the leave request modal | Anywhere |
| `Approve Leave` | Approve the current leave request | When viewing a leave request |
| `Reject Leave` | Reject the current leave request | When viewing a leave request |
| `Upload Document` | Upload a document for the current employee | When viewing an employee (`/employees/:id`) |

---

### VISTA (Analytics)

| Action | Description | Context |
|--------|-------------|---------|
| `Go to Dashboard [Name]` | Jump to a specific dashboard | Anywhere in VISTA |
| `Create Dashboard` | Open the new dashboard modal | Anywhere |
| `Go to Explore` | Navigate to SQL editor (`/explore`) | Anywhere |
| `Refresh Dashboard` | Force-refresh all data on the current dashboard | When viewing a dashboard |
| `Add Widget` | Open the widget picker | When editing a dashboard |
| `Export PDF` | Export the current dashboard as PDF | When viewing a dashboard |
| `Export CSV` | Export the current chart data as CSV | When viewing a dashboard |
| `Set Date Range` | Open the date range picker | When viewing a dashboard |
| `Filter by [Team/Product/Region]` | Apply a filter to the current dashboard | When viewing a dashboard |

---

## 🧠 Design Principles for Implementation

Based on the research:

| Principle | How to Apply |
|-----------|--------------|
| **One shortcut, everywhere** | `⌘K` opens and dismisses the palette from anywhere |
| **Show shortcuts** | Display keyboard shortcuts next to each command to teach power users |
| **Context-aware** | Surface different actions based on the current app and view |
| **Fuzzy matching** | Support typos and partial matches |
| **Categorization** | Group commands: Navigation / Creation / Actions / Settings |
| **Recents first** | Show the last few things the user touched before they type anything |
| **Don't conflate search and actions** | If search is a core feature, it exists at the same structural level, not buried inside the palette |
| **Keyboard-first** | Arrow keys to navigate, Enter to execute, Escape to close |
| **Keep it fast** | The palette should open instantly and feel responsive |

---

## 🚀 Priority Order

| Priority | App | Why |
|----------|-----|-----|
| P0 | Global (all apps) | Navigation between apps is the OS glue |
| P0 | CINQ | CRM is the revenue engine – power users need speed |
| P0 | DIAL | Chat requires fast switching and actions |
| P1 | PIVOT | Document creation and search are frequent |
| P1 | SPARK | Workflow builders benefit from keyboard shortcuts |
| P1 | VISTA | Dashboard navigation and refresh |
| P2 | VAULT, TEMPO, SOND, PAUSE, AEGIS | Nice-to-have, but not critical for MVP |

---

## 📝 Implementation Notes

**Technical stack recommendation:** Use `better-cmdk` (the library behind Linear, Vercel, and many others). It provides fuzzy matching, grouping, and accessible keyboard navigation out of the box. Each app should register its own actions with the global palette, and the palette should filter based on the current route.

**State management:** Use `useCommandPaletteStore` (Zustand) to track:
- `isOpen: boolean`
- `actions: CommandAction[]` (registered per app)
- `currentApp: string` (from the route)
- `recentItems: RecentItem[]` (stored in localStorage)
