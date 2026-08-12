# TASK-038: Frontend SPA — VAULT (Inventory)

## Objective

## API Client Usage
All API calls are provided by `@ataqu/api-client`. Use the generated hooks (`use*Query`, `use*Mutation`) and typed functions. Do not write custom fetch wrappers. The client is already configured with idempotency, auth, and error handling.

Implement VAULT: product catalog with variants, real-time stock display, stock adjustments (atomic, optimistic), movement history, low stock alerts, multi-warehouse, reservations (CINQ deal integration), multi-channel (Shopify sync), command palette actions, cross-app integration badge (CINQ deal), and micro-tour.

## Execution Boundaries
- `apps/vault/src/routes/_auth.products.index.tsx`
- `apps/vault/src/routes/_auth.products.$id.tsx`
- `apps/vault/src/routes/_auth.movements.tsx`
- `apps/vault/src/routes/_auth.warehouses.tsx`
- `apps/vault/src/routes/_auth.reservations.tsx`
- `apps/vault/src/api/`
- `apps/vault/src/components/`
- `apps/vault/src/actions.ts`

## Backend Context Mapping
*The dispatch script has injected `crates/ataqu-domain-vault`, `crates/ataqu-application/src/vault_service.rs`, and `crates/ataqu-api/src/handlers/vault.rs`. You MUST read these to derive:*
- **Entity Types**: Map `Product`, `Variant`, `Movement`, `Warehouse`, `Reservation`, `LowStockAlert` structs to TypeScript.
- **API Endpoints**: `GET /products`, `POST /products`, `GET /products/:id`, `PATCH /products/:id`, `POST /products/:id/variants`, `POST /products/:id/adjust` (stock adjustment), `GET /movements`, `GET /warehouses`, `POST /warehouses`, `GET /reservations`, `POST /reservations`, `GET /products/:id/alerts`, `PATCH /products/:id/alerts`, `POST /sync/shopify`, `GET /api/v1/cross-app/relations?entityId=productId`.
- **Atomic Stock Updates** (ADR-023): Backend uses `UPDATE ... SET stock_quantity = stock_quantity + $1 WHERE id = $2 AND stock_quantity + $1 >= 0` with `CHECK` constraint. Frontend just calls `POST /products/:id/adjust` with `{ change: -1, reason: "sale" }`.
- **Reservations**: When CINQ deal is won, backend emits `CinqDealWonV1` → VAULT consumes and creates reservation. Frontend can also manually reserve via `POST /reservations`.
- **Low Stock Alerts**: Backend checks threshold and emits `VaultStockBelowThresholdV1` to outbox. SPARK consumes.

## UI Contract

### Shell & Layout
- `<Shell activeApp="vault">`.

### Product Catalog (`products.index.tsx`)
- Grid/list toggle. Products with: name, SKU, price, total stock, variant count.
- "Create Product" button. "Import CSV" button (same pattern as CINQ).
- "Export CSV" button.
- Search bar: debounced, filters by name/SKU.
- Low stock badge on products below threshold: `<Badge variant="destructive">Low Stock</Badge>`.
- Empty state: `<EmptyState icon={Package} title="No products" description="Import your product catalog from CSV, or add your first product." ctaLabel="Create Product" />`.

### Product Detail (`products.$id.tsx`)
- Header: name, SKU, price, description.
- **Stock Display**: prominent number, `font-mono`, `text-2xl`. `data-tour="stock-display"` on the stock number.
- **Variants**: table of variants (size, color, stock). "Add Variant" button.
- **Stock Adjustment**: inline form or modal. `data-tour="adjust-stock"` on button. Fields: change amount (+/-), reason (sale/restock/adjustment/damage), warehouse select. `POST /products/:id/adjust` with `Idempotency-Key`. Optimistic UI: stock number updates instantly, reverts on error.
- **Low Stock Alert**: threshold input. "Set Low Stock Alert" button. `PATCH /products/:id/alerts`.
- **Movement History**: table for this product: date, change, reason, warehouse, user.
- **Cross-App Integration Badge**: fetch `GET /api/v1/cross-app/relations?entityId=product.id`. If CINQ reservation exists, show `<Badge variant="info">Reserved for CINQ deal #42</Badge>` with link.
- **Integration Toggle**: `<Switch>` labeled "Reserve stock automatically when CINQ deal is won." `POST /integrations/toggle` with `{ sourceApp: "cinq", targetApp: "vault", entityId: product.id, enabled }`. Badge: "Connected to CINQ".
- **Shopify Sync**: "Sync Shopify" button. `POST /sync/shopify`. Toast: "Shopify sync started."

### Movements (`movements.tsx`)
- `@ataqu/ui` `Table`: date, product, variant, change, reason, warehouse, user.
- Filter by product, date range, warehouse.
- Paginated.
- Empty state: "No movements yet. Adjust stock to see history."

### Warehouses (`warehouses.tsx`)
- List of warehouses: name, address, product count, total stock value.
- "Create Warehouse" button.
- Empty state: "No warehouses. Add your first location."

### Reservations (`reservations.tsx`)
- Table: product, variant, quantity, CINQ deal link, status (active/released), created.
- "Reserve Stock" button: modal with product select, quantity, deal ID.
- Empty state: "No reservations. When CINQ deals are won, stock is reserved automatically."


### 🆕 Shopify Sync (P0)

**Objective:** Connect VAULT to Shopify via OAuth. Sync products, variants, inventory, and orders unidirectionally (Shopify → VAULT) for the MLP. Stock updates are pushed from VAULT → Shopify.

**Backend Context Mapping:**
- **Endpoint:** `POST /api/v1/vault/shopify/sync` (manual force sync).
- **OAuth Flow:** `GET /api/v1/vault/shopify/auth` → Shopify → callback to `/api/v1/vault/shopify/callback`.
- **Webhook (optional):** `/api/v1/vault/shopify/webhook` for real-time updates.
- **Tables:** `vault.shopify_integrations`, `vault.shopify_sync_logs` (ADR-039).
- **Worker:** `shopify_sync_worker` runs every 5 minutes.

**UI Contract:**

**Shopify Connection Settings (VAULT → Settings → Channels):**

**Before connection:**
- Card: "Connect Shopify" with icon.
- Description: "Sync your Shopify products and inventory with VAULT."
- CTA: "Connect Shopify" button → redirects to Shopify OAuth.

**During connection:**
- Shopify OAuth screen (user logs in, authorizes).
- Redirect back to VAULT with `?shopify_sync=success`.

**After connection:**
- Status card showing:
  - Shop name.
  - Connection status: `Connected` (green) or `Error` (red).
  - Last sync timestamp (e.g., "Last sync: 2 minutes ago").
  - Product count (e.g., "1,234 products synced").
- Actions:
  - "Sync now" button (manual force sync).
  - "Disconnect" button (confirmation modal).
- Error log: expandable section showing recent sync errors (max 20 entries).
  - Each error: timestamp, product/order name, error reason, "Retry" button.

**Sync Status in System Health Dashboard (VISTA):**
- New component: "Shopify Sync" with status (green/yellow/red) and last sync timestamp.
- Amber if sync fails > 1 hour. Red if > 6 hours.

**Implementation Steps:**
1. Create `apps/vault/src/api/shopify-api.ts` (OAuth, sync, disconnect).
2. Create `apps/vault/src/components/settings/shopify-connect.tsx` (connection card).
3. Create `apps/vault/src/components/settings/shopify-status.tsx` (status + actions).
4. Create `apps/vault/src/components/settings/shopify-error-log.tsx` (expandable error list).
5. Create `apps/vault/src/hooks/use-shopify-sync.ts` (TanStack Query for sync status).
6. Zustand store: `useShopifyStore` (connection status, sync status, error log).
7. Sync status polling every 10 seconds (or via SSE).

**Definition of Done:**
- [ ] OAuth flow works: redirects to Shopify, returns to VAULT with token.
- [ ] Connection status displays correctly.
- [ ] "Sync now" button triggers manual sync.
- [ ] Error log displays recent sync failures with retry.
- [ ] System Health Dashboard shows Shopify sync status.
- [ ] Sync status updates in real-time (no page refresh).
- [ ] "Disconnect" button requires confirmation.


### Command Palette Actions (`apps/vault/src/actions.ts`)
- `Create Product` → opens product creation modal
- `Create Variant` → only when viewing a product
- `Go to Products` → navigate to `/products`
- `Go to Movements` → navigate to `/movements`
- `Go to Warehouses` → navigate to `/warehouses`
- `Go to Reservations` → navigate to `/reservations`
- `Search Products` → focuses product search
- `Adjust Stock` → only when viewing a product
- `Set Low Stock Alert` → only when viewing a product
- `Reserve Stock for Deal [ID]` → opens reservation modal
- `Connect to CINQ` → toggles CINQ integration
- `Export Products CSV` → triggers export
- `Sync Shopify` → triggers sync

### Micro-Tour (from `micro-tours.md`)
- Tour ID: `vault-stock-tour`
- Trigger: First visit to `/products/:id`.
- Steps:
  1. Target `[data-tour="stock-display"]` — Content: "Real-time stock. Zero race conditions." Action: view.
  2. Target `[data-tour="adjust-stock"]` — Content: "Adjust it. The math is protected at the database level. No overselling." Action: click.

### Toasts
- "Stock adjusted." / "Product created." / "Variant added."
- "Low stock alert set." / "Reservation created."
- "VAULT connected to CINQ." / "Shopify sync started."
- "Export ready." / "Movement logged."

### Optimistic UI
- Stock adjustment: number updates instantly, reverts on error.
- Product create: appears in list instantly.
- Reservation create: appears in list instantly.
- Integration toggle: switch flips instantly.

### Styling
- Dark-mode native. High-density data tables.
- Stock number: `font-mono text-2xl font-bold`.
- Low stock: `text-destructive`.
- In stock: `text-success`.
- `data-tour` attributes on stock display and adjust button.

## Implementation Plan (Development Script)
1. Create types, API client.
2. Create `product-catalog.tsx` (grid/list, search, low stock badge).
3. Create `product-detail.tsx` (stock display, variants, adjustment, alerts, cross-app badge, integration toggle).
4. Create `stock-adjustment.tsx` (modal, optimistic UI).
5. Create `movement-history.tsx` (table, filters).
6. Create `warehouse-list.tsx`.
7. Create `reservation-list.tsx` (with CINQ deal link).
8. Create `csv-import.tsx` (same pattern as CINQ).
9. Create `apps/vault/src/actions.ts`.
10. Implement routes: products index, product detail, movements, warehouses, reservations.
11. Add `data-tour` attributes.
12. Wrap `/products/:id` with `<OnboardTour>`.
13. Run gates, commit.

## Definition of Done (DoD)
- [ ] Stock updates render optimistically and revert on error.
- [ ] Variants table works with add/edit.
- [ ] Movement history is paginated and filterable.
- [ ] Low stock alerts can be configured per product.
- [ ] Reservations show CINQ deal link.
- [ ] Cross-app badge shows CINQ reservation with link.
- [ ] Integration toggle calls correct endpoint, shows badge.
- [ ] Shopify sync button triggers backend.
- [ ] All 13 command palette actions registered.
- [ ] Micro-tour triggers on first visit to `/products/:id`.
- [ ] All empty states use `<EmptyState>`.
- [ ] All toasts contextual.
- [ ] All mutations include `Idempotency-Key`.
- [ ] No `any` types. Gates pass.
