# TASK-081: Stack Decommission Dashboard (`/audit`)

## Objective
Build a global dashboard that tracks competitor cancellations and savings, accessible from the Shell.

## Execution Boundaries
- `apps/audit/src/routes/_auth/index.tsx`
- `apps/audit/src/api/`
- `apps/audit/src/components/`
- `packages/ui/src/components/decommission-card.tsx`

## API Client Usage
All API calls are provided by `@ataqu/api-client`. Use the generated hooks (`use*Query`, `use*Mutation`) and typed functions. Do not write custom fetch wrappers. The client is already configured with idempotency, auth, and error handling.

## Backend Context
- The backend will provide `GET /api/v1/audit/status` (to be implemented separately).
- Until then, use a mock hook with static data.
- Returns per‑competitor status: `{ id, name, status: 'not_tracked'|'tracking'|'decommissioned', savings: number }`.

## UI Contract
- Glassmorphic card grid: each competitor (HubSpot, Slack, Zapier, Notion, etc.) with logo, status badge, and savings.
- "Mark as Canceled" button on each card (optimistic UI).
- Total Monthly Savings KPI at the top (animated number).
- Progress bar showing how many competitors are decommissioned.
- Quick links to competitor cancellation pages and migration guides.

## Implementation Plan
1. Create `apps/audit` app structure (similar to others).
2. Use `useDecommissionStatusQuery` from `@ataqu/api-client` (or mock).
3. Build competitor cards with status toggles.
4. Wire up optimistic updates.
5. Add to Shell navigation (global route).

## Definition of Done
- [ ] Competitor cards display with logos, status, savings.
- [ ] "Mark as Canceled" toggles optimistically.
- [ ] Total savings KPI updates smoothly.
- [ ] Progress bar reflects decommission count.
- [ ] Links to cancellation guides work.

