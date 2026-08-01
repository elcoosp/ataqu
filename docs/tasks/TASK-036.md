# TASK-036: Frontend SPA: TEMPO (Scheduling)

## Execution Boundaries
 - `apps/tempo/`

## Step-by-Step Implementation Details
 1. **Context Mapping**: Read injected backend files (`tempo_service.rs`, `handlers/tempo.rs`).\n2. **Routing**: TanStack Router for public `/book/:slug` and internal `/dashboard`.\n3. **Public Booking Page**: Display available time slots for an event type. Implement calendar grid UI. Handle timezone detection (using `Intl.DateTimeFormat`).\n4. **Dashboard**: Form to configure event types (duration, name, availability window).\n5. **OAuth Integration**: Button to initiate Google Calendar OAuth flow (redirect to backend).\n6. **Styling**: Tailwind 4 + shadcn/ui. Dark-mode native.\n7. **Idempotency**: Booking creation must include `Idempotency-Key` to prevent double-bookings on double-clicks.

## Success Criteria & Verification
 - [ ] `pnpm build` succeeds with 0 TypeScript errors.\n- [ ] Bundle size is ≤ 500 KB gzipped.\n- [ ] Time slots render correctly based on backend availability.\n- [ ] Booking mutation is idempotent.
