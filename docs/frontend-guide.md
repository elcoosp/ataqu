# 📘 Frontend Development Guide — Ataqu SPA Standards

This guide ensures all 10 SPAs are built consistently, production‑grade, and aligned with the Ataqu brand. Every frontend agent **must** follow these rules.

---

## 1. Project Structure

Every app must follow this exact structure:

```
apps/<app-name>/
├── src/
│   ├── api/              # Typed API functions (or re‑exports from @ataqu/api-client)
│   ├── components/       # App‑specific components (shared components come from @ataqu/ui)
│   ├── hooks/            # App‑specific custom hooks (reuse @ataqu/shared-hooks when possible)
│   ├── stores/           # App‑specific Zustand stores
│   ├── routes/           # TanStack Router file‑based routes
│   │   ├── __root.tsx    # Root layout with providers (QueryClient, I18n, Shell, OnboardTour)
│   │   ├── _auth.tsx     # Protected route wrapper (checks auth)
│   │   ├── login.tsx
│   │   ├── index.tsx     # Redirects to /dashboard or /login
│   │   ├── _auth/
│   │   │   ├── dashboard.tsx
│   │   │   └── ...       # Other protected routes
│   │   └── $.tsx         # 404 fallback
│   ├── main.tsx
│   ├── index.css         # Imports Tailwind and global styles
│   └── vite-env.d.ts     # Type declarations for Vite env (if needed)
├── e2e/                  # Playwright tests
├── package.json
├── vite.config.ts        # Uses @ataqu/vite-preset
└── tsconfig.json         # Extends base config
```

**File naming:** All `.ts`, `.tsx`, `.json` files must use **`kebab-case`** (e.g., `message-list.tsx`). Entry points (`main.tsx`, `vite.config.ts`) are exceptions.

---

## 2. Styling & Theming

- **Tailwind 4** with the shared `@ataqu/tailwind-config` preset.
- **Never hardcode** colors, spacing, or fonts. Use tokens:
  - `bg-background`, `text-foreground`, `border-border`, `bg-card`, `text-card-foreground`
  - Amber (`bg-primary`, `text-primary-foreground`) **only** for primary CTAs and active states.
  - `font-heading` (Unbounded) for headings, `font-body` (Inter) for body text.
  - 8‑point grid: spacing values must be multiples of 8 (e.g., `p-4`, `gap-6`, `mt-8`).
- **Glassmorphism:** Use the `.ataqu-glass` utility class for modals, command palette, and tooltips.
- **Dark mode only.** No light mode. Set `class="dark"` on `<html>`.
- **No loading spinners** – use skeleton loaders (`<Skeleton />` from shadcn/ui) or optimistic UI.
- **Focus states:** Use `focus-visible:ring-2 focus-visible:ring-ring` (ring = amber).
- **Responsive:** Mobile‑first, using Tailwind’s responsive prefixes (`sm:`, `md:`, `lg:`). Touch targets ≥44px.

---

## 3. Mobile‑First Development

### Philosophy
All Ataqu applications must be fully functional on mobile. **Mobile‑first** means we design for small screens first, then progressively enhance for larger screens.

### Breakpoints
Use Tailwind breakpoints:
- `sm: 640px` – phones in landscape
- `md: 768px` – tablets
- `lg: 1024px` – small desktops
- `xl: 1280px` – large desktops

### Rules
- **Layout:** Start with a single column (`grid-cols-1`), then adapt to `md:grid-cols-2`, `lg:grid-cols-3`, `xl:grid-cols-4` when appropriate.
- **Sidebar:** On mobile, the sidebar is a drawer (slide‑in). The hamburger button is always visible.
- **Navigation:** Main navigation lives in the drawer. A simplified bottom navigation bar may be added for primary actions.
- **Complex components:**
  - **DataTable:** On mobile, display a "card" view (`md:table`).
  - **KanbanBoard:** On mobile, display a vertical list with stacked columns (no horizontal scroll).
  - **Charts:** Reduce legend size and use `aspect-ratio` to adapt.
  - **WorkflowCanvas:** On mobile, show a message "Optimized for desktop" with a simplified read‑only version.
- **Touch targets:** All interactive elements must have a minimum size of **44x44 px** (WCAG 2.2).
- **Gestures:** Support touch gestures (drag for Kanban, swipe to close modals).
- **Forms:** Inputs must be full‑width (`w-full`) with clear labels. Use appropriate `inputmode` (`tel`, `email`, `numeric`).
- **Images:** Use `max-w-full h-auto` and `object-cover` to avoid overflow.
- **Text:** Do not exceed 70 characters per line on mobile.
- **Modals:** On mobile, modals must be full‑screen (`h-screen`).
- **Toasts:** On mobile, toasts appear at the bottom (`bottom-4`).

### Testing mobile
- Test on iPhone SE (375px) and Pixel 5 (393px) in portrait and landscape.
- Use browser dev tools (responsive mode).
- Verify touch targets with a stylus or in touch mode.
- Ensure the virtual keyboard does not hide input fields (scroll into view).

---

## 4. UI Components

### Shared Components (from `@ataqu/ui`)
- **`Shell`** – wraps the entire app. Pass `activeApp` prop.
- **`CommandPalette`** – triggered by `⌘K`. Do not re‑implement.
- **`OnboardTour`** – for micro‑tours. Use `useOnboardingStore`.
- **`DataTable`** – for lists with sorting, filtering, pagination, virtualization.
- **`KanbanBoard`** – for drag‑and‑drop pipelines.
- **`FormBuilder`** – for SOND.
- **`WorkflowCanvas`** – for SPARK.
- **`Chart`** – for VISTA.
- **`EmptyState`** – must be used for all empty states.

### App‑Specific Components
- Write components in `src/components/`, each in its own file (kebab‑case).
- Keep components **pure** – fetch data in routes, pass props down.
- Use **shadcn/ui** primitives (`Button`, `Input`, `Card`, etc.) from `@ataqu/ui`.

### Empty States
Every empty state must use `<EmptyState>` with:
- A Lucide icon
- Bold, title‑case heading (no exclamation marks)
- One‑line description
- A single primary CTA (button)

Example:
```tsx
<EmptyState
  icon={Users}
  title="No contacts yet"
  description="Drop your HubSpot CSV here, or create your first contact."
  ctaLabel="Create Contact"
/>
```

---

## 5. Data Fetching & State

- **Server state:** Use TanStack Query (`useQuery`, `useMutation`) with hooks generated by `@ataqu/api-client`.
- **Never** write raw `fetch` calls.
- **Query keys:** Prefix with `['app', ...]` (e.g., `['cinq', 'contacts']`).
- **Mutations:** Always include an `Idempotency-Key` header via `useIdempotency()`.
  ```ts
  const { getKey } = useIdempotency();
  const mutation = useMutation({
    mutationFn: (data) => createContact(data, { headers: { 'Idempotency-Key': getKey() } }),
  });
  ```
- **Optimistic UI:** Implement immediate updates with rollback on error (150ms rule). Use `useOptimistic` from `@ataqu/shared-hooks` or manual `onMutate`/`onError`.
- **Global UI state:** Use `@ataqu/shared-stores` (`useAuthStore`, `useUIStore`, `useOnboardingStore`).
- **App‑specific state:** Use Zustand with `persist` middleware if needed (e.g., `useDialStore` for focus mode).
- **URL state:** Use `nuqs` for search params (filters, pagination) to keep the URL in sync.

---

## 6. Routing (TanStack Router)

- Use **file‑based routing** – route files go in `src/routes/`.
- **Protected routes:** Wrap all authenticated routes with `_auth.tsx`.
- **Root layout:** In `__root.tsx`, include all providers:
  ```tsx
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <OnboardTour tourId="default" steps={[]}>
        <Shell activeApp="app-name">
          <Outlet />
        </Shell>
      </OnboardTour>
    </I18nProvider>
  </QueryClientProvider>
  ```
- **Lazy loading:** Use `lazy` imports for route components to keep bundles small.
- **Navigation:** Use `<Link>` from `@tanstack/react-router` for internal links.

---

## 7. Internationalisation (Lingui)

- Wrap **all user‑visible strings** with `<Trans>` or `t` macro:
  ```tsx
  import { Trans } from '@lingui/react/macro';
  <Trans>Welcome to your workspace</Trans>
  ```
- **Never** hardcode English text.
- Placeholders and dynamic values: use `t` with variables:
  ```ts
  const label = t`Hello ${name}`;
  ```
- **Dates & numbers:** Use `Intl.DateTimeFormat` and `Intl.NumberFormat` with the current locale.

---

## 8. Testing

- **Unit tests:** Vitest, placed alongside components (e.g., `component.test.tsx`).
- **E2E tests:** Playwright, in `e2e/` – at least one test per critical user flow.
  - Include mobile viewport tests (375px, 768px).
- **Mocking:** Use `@ataqu/test-utils` (MSW, renderWithProviders).
- **Coverage:** Aim for >80% on critical paths.

---

## 9. Performance & Accessibility

- **Bundle size:** Each app must stay ≤500 KB gzipped (Vite manualChunks handles this).
- **Accessibility:** WCAG 2.2 AA – contrast, keyboard navigation, focus rings, ARIA labels.
- **Semantic HTML:** Use `<main>`, `<section>`, `<h1>`–`<h6>`, `<button>`, `<label>`.
- **Images:** Always include `alt` and explicit dimensions.
- **Motion:** Respect `prefers-reduced-motion`. Use 150ms transitions with `ease-out`.
- **Live regions:** Use `role="status"` or `aria-live="polite"` for dynamic updates (toasts, loading states).
- **Focus management:** After modal close, return focus to the trigger. After form submission, focus the first error or success message.
- **Keyboard navigation:** All interactive elements must be reachable and operable with keyboard. Use `:focus-visible` for focus indicators.

---

## 10. Code Quality

- **TypeScript strict mode** – no `any`; use explicit return types.
- **Biome** for linting/formatting – run `pnpm biome check --apply .` before committing.
- **No console.log** in production code – use `tracing` for logging (backend) or `console.warn` sparingly.
- **Imports:** Use absolute paths with `@/` alias (e.g., `@/components/button`). Shared packages use `@ataqu/*`.
- **Commit messages:** Follow conventional commits (`feat(scope): subject`).

---

## 11. Environment Variables

- Use `import.meta.env.VITE_*` for public variables.
- Define types in `src/vite-env.d.ts` if needed.
- **Never** commit `.env` files – use `.env.example` as a template.

---

## 12. Micro‑Tours (OnboardJS)

- Tours are defined as arrays of steps in the app’s route component.
- Use `useOnboardingStore` to check completion.
- Wrap the route with `<OnboardTour tourId="..." steps={...} />`.
- Steps should be action‑oriented, not just descriptions (e.g., "Click the button").
- Skip button always visible.

---

## 13. Error Handling

- Use the shared toast system for user‑facing errors.
- Show inline validation errors (React Hook Form + Zod).
- For API errors, map them to user‑friendly messages in `handleApiError` from `@ataqu/shared-utils`.
- **Never** show raw error objects to the user.
- **Network errors:** Show "Connection lost. Reconnecting…" and retry automatically.
- **503 errors:** Show "Service temporarily unavailable. Retry in a few seconds." with a retry button.
- **409 conflicts:** Show "Another user modified this item. Reload?" with a reload action.

---

## 14. Build & Dev

- `pnpm dev` – starts all apps in development mode.
- `pnpm build` – builds all apps (production).
- `pnpm test` – runs Vitest.
- `pnpm test:e2e` – runs Playwright.
- Each app’s Vite config is provided by `@ataqu/vite-preset`.

---

## 15. Checklist for Each Task

Before marking a frontend task as complete, verify:

- [ ] All user‑visible strings are wrapped with Lingui.
- [ ] All mutations include `Idempotency-Key`.
- [ ] Empty states use `<EmptyState>`.
- [ ] Toasts are contextual (not generic "Saved").
- [ ] Optimistic UI is implemented for all mutating actions.
- [ ] Skeleton loaders (no spinners) for loading states.
- [ ] Keyboard navigation works (focus rings visible).
- [ ] All imports use the correct path (shared packages from `@ataqu/*`).
- [ ] All tests pass (unit + E2E).
- [ ] App builds without errors and bundle size ≤500 KB.
- [ ] Mobile‑first: all screens work on 375px viewport.
- [ ] Touch targets ≥44px.
- [ ] Modals are full‑screen on mobile.
- [ ] Toasts appear at bottom on mobile.
- [ ] DataTable adapts to card view on mobile.
- [ ] Kanban adapts to vertical list on mobile.
- [ ] Charts are responsive.
- [ ] Sidebar is a drawer on mobile.
- [ ] Live regions (`aria-live`) are used for dynamic updates.
- [ ] Focus management is correct after modal close and form submission.

---

**This guide is the single source of truth. Any deviation must be approved by the lead architect. Violations will block PRs.**
