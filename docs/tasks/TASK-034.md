# TASK-034: Frontend SPA — PIVOT (Docs & Databases)

## Objective
Implement PIVOT: Markdown document editor with live preview, relational database tables with inline editing and views, sub-15ms search (tsvector GIN), native relations to CINQ deals and VAULT products, templates, checklists, version history, blocks, command palette actions, and micro-tour.

## Execution Boundaries
- `apps/pivot/src/routes/_auth.index.tsx`
- `apps/pivot/src/routes/_auth.doc.$id.tsx`
- `apps/pivot/src/routes/_auth.db.index.tsx`
- `apps/pivot/src/routes/_auth.db.$id.tsx`
- `apps/pivot/src/routes/_auth.templates.tsx`
- `apps/pivot/src/api/`
- `apps/pivot/src/components/`
- `apps/pivot/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-pivot`, `crates/ataqu-application/src/pivot_service.rs`, and `crates/ataqu-api/src/handlers/pivot.rs`. You MUST read these to derive:*
- **Entity Types**: Map `Document`, `Database`, `DatabaseRow`, `View`, `Block`, `Template`, `Version` structs to TypeScript interfaces.
- **API Endpoints**: `GET /documents`, `POST /documents`, `GET /documents/:id`, `PATCH /documents/:id`, `GET /documents/:id/versions`, `GET /documents/:id/blocks`, `POST /documents/:id/blocks`, `GET /databases`, `POST /databases`, `GET /databases/:id/rows`, `POST /databases/:id/rows`, `PATCH /databases/:id/rows/:rowId`, `GET /search?q=`, `GET /templates`, `POST /templates`, `GET /documents/:id/relations`, `POST /documents/:id/relations`.
- **Search**: Backend uses PostgreSQL `tsvector` with GIN indexes (ADR-009). Results return sub-15ms.
- **Relations**: A `DatabaseRow` can have `relations: { app: "cinq", entityId: "uuid", label: "Deal: Acme Corp" }`. A document can be linked to a CINQ deal or VAULT product via `POST /documents/:id/relations`.

## UI Contract

### Shell & Layout
- `<Shell activeApp="pivot">`.

### Document List (`index.tsx`)
- Grid/list toggle. Documents shown as cards: title, last edited, icon.
- "Create Document" button. "Create Database" button.
- Global search bar: debounced 200ms, calls `GET /search?q=`. Results grouped by type (Documents, Database Rows).
- Empty state: `<EmptyState icon={FileText} title="No documents" description="Create your first document, or link it to a CINQ deal." ctaLabel="Create Document" />`.

### Document Editor (`doc.$id.tsx`)
- Split-pane. Left: Markdown textarea. Right: Rendered preview using `react-markdown` with `remark-gfm`.
- NO rich-text block editor for MLP. Markdown only.
- Auto-save with 500ms debounce: `PATCH /documents/:id` with content.
- Save indicator: "Saved." (not "🎉 Saved successfully!").
- **Blocks**: Insert code blocks, tables, embeds via markdown syntax. No drag-and-drop blocks.
- **Checklists**: `- [ ]` and `- [x` render as checkboxes in preview. Clicking toggles.
- **Templates**: "Apply Template" button opens modal. Templates listed from `GET /templates`. Apply replaces content.
- **Version History**: "Toggle Version History" button opens side panel. List of versions with timestamps. Click to preview. "Restore" button.
- **Relations**: "Link to CINQ Deal" button opens searchable dropdown querying `GET /cinq/deals?q=`. Selecting sets relation via `POST /documents/:id/relations`. Show linked deal as badge with link to `crm.ataqu.com/deals/:id`. Also "Link to VAULT Product" with same pattern.
- **Export Markdown**: Button downloads `.md` file.
- **Duplicate Document**: Button creates copy.

### Database View (`db.$id.tsx`)
- High-density data grid. Columns are typed: text, number, select, date, relation.
- Rows are inline-editable. Click cell to edit. Enter to save (optimistic UI).
- "Add Row" button at bottom.
- Column headers: click to sort. Filter button opens filter builder.
- Views: "Create View" button (saved filter + sort combination).
- **Relation Column**: When column type is "relation to CINQ deal", clicking cell opens searchable dropdown querying `GET /cinq/deals?q=`. Selecting sets relation. Display as clickable link.
- `data-tour="new-row"` on "Add Row" button. `data-tour="relation-column"` on first relation column.
- Empty state: `<EmptyState icon={Database} title="No rows" description="Add your first row to start building." ctaLabel="Add Row" />`.

### Templates Page (`templates.tsx`)
- Grid of template cards: name, description, preview.
- "Create Template" button. Template editor: name, content (Markdown), variables ({{name}}).

### Command Palette Actions (`apps/pivot/src/actions.ts`)
- `Create Document` → opens new document
- `Create Database` → opens new database
- `Go to [Document]` → fuzzy search documents
- `Go to [Database]` → fuzzy search databases
- `Go to Templates` → navigate to `/templates`
- `Search Documents` → focuses global search
- `Link to CINQ Deal` → only when viewing a document
- `Link to VAULT Product` → only when viewing a document
- `Insert [Block Type]` → only when editing a document (code, table, checklist)
- `Toggle Version History` → only when viewing a document
- `Export Markdown` → only when viewing a document
- `Duplicate Document` → only when viewing a document

### Micro-Tour (from `micro-tours.md`)
- Tour ID: `pivot-db-tour`
- Trigger: First visit to `/db/:id`.
- Steps:
  1. Target `[data-tour="new-row"]` — Content: "High-density data. No 5-second load times." Action: click.
  2. Target `[data-tour="relation-column"]` — Content: "Link natively to CINQ deals. No API keys required." Action: click.

### Toasts
- "Saved." (auto-save)
- "Document created."
- "Row added."
- "Linked to CINQ deal."
- "Template applied."
- "Version restored."
- "Exported as Markdown."

### Optimistic UI
- Cell edit: value updates instantly.
- Row add: empty row appears instantly.
- Relation set: badge appears instantly.
- Auto-save: no visual indicator except "Saved." text.

### Styling
- Dense, minimal. `font-mono` for database cells.
- No card shadows. Borders only.
- Split-pane editor: `bg-background` for textarea, `bg-card` for preview.

## Implementation Plan (Development Script)
1. Create types, API client, hooks.
2. Create `document-editor.tsx` (split-pane Markdown + preview, auto-save 500ms debounce).
3. Create `database-grid.tsx` (inline-editable, typed columns, sort, filter).
4. Create `relation-cell.tsx` (CINQ deal / VAULT product picker).
5. Create `version-history.tsx` (side panel).
6. Create `template-picker.tsx` (modal).
7. Create `search-bar.tsx` (debounced tsvector search, grouped results).
8. Create `apps/pivot/src/actions.ts`.
9. Implement routes: index, doc detail, db index, db detail, templates.
10. Add `data-tour` attributes.
11. Wrap `/db/:id` with `<OnboardTour>`.
12. Run gates, commit.

## Definition of Done (DoD)
- [ ] Markdown editor renders preview in real-time with `react-markdown` + `remark-gfm`.
- [ ] Auto-save with 500ms debounce. Indicator shows "Saved." only.
- [ ] Database grid supports inline editing with optimistic UI.
- [ ] Relation column queries CINQ deals and VAULT products, sets relation.
- [ ] Search is debounced (200ms) and results grouped by type.
- [ ] Version history opens in side panel with restore.
- [ ] Templates can be applied to documents.
- [ ] Checklists render as checkboxes in preview.
- [ ] All 12 command palette actions registered.
- [ ] Micro-tour triggers on first visit to `/db/:id`.
- [ ] All empty states use `<EmptyState>`.
- [ ] All toasts contextual.
- [ ] All mutations include `Idempotency-Key`.
- [ ] No `any` types. Gates pass.
