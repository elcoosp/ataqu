Here is the refined, English version of the **TASK-000** specification without the `dispatch.sh` details (we will adjust the script separately). This is ready to be saved as `docs/tasks/TASK-000.md` and used as the foundation for all frontend work.

---

# TASK-000: Frontend Foundation & Unified Shell

**Version:** 1.0  
**Date:** 2026-08-02  
**Status:** To be executed (one‑time, before any SPA)  
**Type:** Foundation

---

## Objective

Build the **entire shared frontend infrastructure** – monorepo, packages, unified shell, API client, i18n, testing, and CI – so that all 10 SPAs (TASK‑031 to TASK‑040) can be developed independently with maximal code reuse and consistency.

After this task completes, every SPA task will only need to implement its own pages and business logic, relying entirely on the shared packages.

---

## Execution Boundaries

- `apps/*/` (all 10 app directories)
- `packages/*/` (all shared packages)
- Root configuration files: `pnpm-workspace.yaml`, `package.json`, `biome.json`, `tsconfig.base.json`, `.env.example`, `vitest.workspace.js`, `playwright.config.ts`, `lingui.config.ts`
- `scripts/` (helper scripts, especially for API client generation)
- `.github/workflows/ci.yml`
- `README.md` (root documentation)

---

## Conventions

- **File naming:** All `.ts`, `.tsx`, `.js`, `.json` files **must** use `kebab-case` (e.g., `message-list.tsx`, `use-channel-query.ts`). Exceptions are allowed only for entry points like `vite.config.ts` or `main.tsx`.
- **Coding standards:** TypeScript strict mode, explicit return types, no `any`. Biome enforces linting and formatting.
- **Internationalisation:** All user‑visible strings must be wrapped with Lingui macros (`<Trans>` or `t`).

---

## Deliverables

### 1. Monorepo Structure

Create the following directory layout:

```
ataqu/
├── apps/                    # 10 applications (empty shells)
│   ├── aegis/
│   ├── cinq/
│   ├── dial/
│   ├── pivot/
│   ├── spark/
│   ├── tempo/
│   ├── sond/
│   ├── vault/
│   ├── pause/
│   └── vista/
├── packages/                # All shared packages
│   ├── api-client/          # Generated API client (types + fetchers + hooks)
│   ├── types/               # Shared domain types (TenantId, User, etc.)
│   ├── tailwind-config/     # Tailwind configuration with design tokens
│   ├── ui/                  # UI components, Shell, layouts, Command Palette
│   ├── shared-hooks/        # Generic hooks (useWebSocket, useSSE, etc.)
│   ├── shared-utils/        # Utilities (dates, currency, Idempotency‑Key, etc.)
│   ├── shared-stores/       # Zustand stores (auth, UI, onboarding)
│   ├── shared-schemas/      # Zod schemas (email, password, etc.)
│   ├── shared-i18n/         # Lingui configuration and base translations
│   ├── vite-preset/         # Shared Vite configuration
│   └── test-utils/          # Testing helpers (MSW, render wrappers)
├── scripts/
│   └── generate-api-client.ts   # Script that reads Rust code and generates the API client
├── pnpm-workspace.yaml
├── package.json (root)
├── biome.json
├── tsconfig.base.json
├── .env.example
├── vitest.workspace.js
├── playwright.config.ts
├── lingui.config.ts
└── README.md
```

**Root `package.json` scripts:**
- `dev` – starts all apps in dev mode (parallel)
- `build` – builds all apps (parallel)
- `test` – runs all Vitest tests (parallel)
- `test:e2e` – runs Playwright tests
- `lint` – runs Biome check
- `extract` – extracts Lingui messages
- `compile` – compiles Lingui catalogs
- `generate:api` – runs the API client generator script

---

### 2. Shared Packages (Detailed)

#### 2.1 `@ataqu/types`

Exports shared TypeScript types used across multiple apps:
- `TenantId` (UUID)
- `User` (id, email, tenantId, roles)
- `ApiError` (code, message, details)
- Pagination types (`PaginationParams`, `SortOrder`, etc.)

These types must be compatible with the Rust backend structs (the API client generator will produce them automatically, but this package holds hand‑written shared types if needed).

---

#### 2.2 `@ataqu/tailwind-config`

A Tailwind preset that includes:
- **Colors** – Deep Night Blue (`#0A1628`), Amber (`#F59E0B`), semantic colors (success/error/warning), and the full palette from the visual identity.
- **Fonts** – Unbounded (headings), Inter (body), JetBrains Mono (code).
- **Spacing** – 8‑point grid (4, 8, 16, 24, 32, 48, 64, 96).
- **Custom utilities:**
  - `.ataqu-glass` – glassmorphism background, blur, and border.
  - `.ataqu-shadow-sm`, `.ataqu-shadow-md` – strict shadow values.
- **Dark mode** – native with `dark:` variants.

---

#### 2.3 `@ataqu/ui`

**A. All shadcn/ui components** – installed via `shadcn-ui@latest init` and exported from a central barrel. These include: `Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Switch`, `Slider`, `Textarea`, `Label`, `Form`, `Card`, `Sheet`, `Dialog`, `Popover`, `DropdownMenu`, `Command`, `Toast`, `Tooltip`, `Badge`, `Avatar`, `Skeleton`, `Tabs`, `Table`.

**B. Layouts:**
- `PageLayout` – standard page container with padding and max‑width.
- `DashboardLayout` – high‑density grid for dashboards.
- `AuthLayout` – centered, without sidebar (for login/MFA pages).

**C. Unified Shell:**
- `Shell` component – wraps the entire app. It includes:
  - Left sidebar with 10 app icons (Lucide) and navigation links (using `<a>` to subdomains).
  - Top header with app name, user avatar, and a button to toggle the command palette.
  - The command palette (`⌘ K`).
  - Responsive behaviour (collapsible sidebar on mobile).
- Props: `activeApp: string` – highlights the current app in the sidebar.

**D. Command Palette:**
- Triggered by `⌘ K` (or `Ctrl K`).
- Two sections:
  1. **Navigation** – quick links to other apps (hardcoded list).
  2. **Search** – if the app provides a search function, it is called with the query and results are displayed.
- Built with the `Command` component from shadcn/ui.

**E. Onboarding Micro‑tours (`onboardjs`):**
- Integration with `@reactour/tour` (or `onboardjs`).
- A component `OnboardTour` that reads the tour steps from a configuration.
- Styled with glassmorphism (using `.ataqu-glass`).
- State managed by `useOnboardingStore` (see below).

**F. Shared Business Components:**
- `DataTable` – wrapper around TanStack Table + TanStack Virtual + pagination/filtering.
- `KanbanBoard` – using `@dnd-kit/sortable` for drag‑and‑drop.
- `FormBuilder` – for SOND (drag‑and‑drop form fields).
- `WorkflowCanvas` – for SPARK (React Flow).
- `Chart` – wrapper around Recharts for VISTA dashboards.

---

#### 2.4 `@ataqu/shared-hooks`

Generic hooks that can be used across any app:

- `useWebSocket(url, options)` – manages WebSocket connection, automatic reconnection with exponential backoff, message sending/receiving, and integrates with TanStack Query cache updates.
- `useSSE(url, options)` – connects to a Server‑Sent Events endpoint; updates TanStack Query cache on each event; falls back to polling if SSE fails.
- `useIdempotency()` – generates a UUID v4 and attaches it to the `Idempotency-Key` header for POST/PUT/PATCH requests.
- `useOptimistic(mutationFn, options)` – performs an optimistic update and rolls back on error.
- `useOnboard(tourId, steps)` – controls the micro‑tour (start, next, skip, check completion).
- `useLocalStorage(key, initialValue)` – reads/writes to localStorage with JSON serialisation.
- `useDebounce(value, delay)` – debounces a value.
- `useClickOutside(ref, handler)` – detects clicks outside an element.
- `useHotkeys(key, callback)` – keyboard shortcut listener.

All hooks are fully typed and work with the generated API client types.

---

#### 2.5 `@ataqu/shared-utils`

Pure utility functions:

- `generateIdempotencyKey(): string` – returns a UUID v4.
- `formatDate(date, locale?)` – uses `Intl.DateTimeFormat`.
- `formatCurrency(amount, currency?)` – uses `Intl.NumberFormat`.
- `truncateText(text, maxLength)` – truncates with ellipsis.
- `buildQueryString(params)` – converts an object to a URL query string.
- `handleApiError(error)` – transforms an API error into a user‑friendly message (and shows a toast).
- `sleep(ms)` – returns a promise that resolves after `ms`.
- `deepClone<T>(obj)` – simple recursive clone.

---

#### 2.6 `@ataqu/shared-stores`

Zustand stores with persistence where needed:

- **`useAuthStore`**:
  ```ts
  interface AuthState {
    token: string | null;
    user: User | null;
    tenantId: TenantId | null;
    login: (token: string, user: User) => void;
    logout: () => void;
  }
  ```
  Persisted in localStorage.

- **`useUIStore`**:
  ```ts
  interface UIState {
    sidebarOpen: boolean;
    focusMode: boolean;      // for DIAL
    theme: 'dark' | 'light';
    toggleSidebar: () => void;
    setFocusMode: (enabled: boolean) => void;
    setTheme: (theme: 'dark' | 'light') => void;
  }
  ```
  Persisted (theme, sidebar state).

- **`useOnboardingStore`**:
  ```ts
  interface OnboardingState {
    completedTours: Record<string, boolean>;
    markCompleted: (tourId: string) => void;
    isCompleted: (tourId: string) => boolean;
  }
  ```
  Persisted.

---

#### 2.7 `@ataqu/shared-schemas`

Zod schemas reused across apps:

- `emailSchema` – validates email format.
- `passwordSchema` – minimum 8 characters, at least one number, one uppercase, etc.
- `uuidSchema` – valid UUID v4.
- `dateSchema` – ISO date string.
- `loginSchema` – { email, password }.
- `signupSchema` – { email, password, confirmPassword }.

---

#### 2.8 `@ataqu/shared-i18n`

Set up **Lingui 6**:

- `lingui.config.ts` with locales `en` and `fr`.
- `i18n.ts` – initialises Lingui with dynamic loading of messages.
- `I18nProvider` – wraps the app and provides the i18n instance.
- Base translations for common UI strings (buttons, errors, etc.) in `locales/en/messages.po` and `locales/fr/messages.po`.

Usage:
```tsx
import { Trans, t } from '@lingui/macro';
<Trans>Welcome</Trans>
const label = t`Email address`;
```

**Extraction/Compilation scripts:**
- `pnpm extract` – runs `lingui extract` to scan source files.
- `pnpm compile` – compiles `.po` files to JSON.

---

#### 2.9 `@ataqu/vite-preset`

A shared Vite configuration (function) that accepts an `appName` and returns a Vite config with:

- **Aliases:** `@ataqu/*` → `../../packages/*`
- **Proxy:** `/api` → `http://localhost:8080`, `/ws` → `ws://localhost:8080`
- **Manual chunks:** split into `vendor-react`, `vendor-tanstack`, `vendor-ui`, `vendor-heavy` (for BlockNote, React Flow, Recharts).
- **Optimisation:** pre‑bundle heavy dependencies.
- **Build:** `target: 'es2024'`, `minify: 'esbuild'`, sourcemaps.
- **CSS:** Tailwind 4 integration (import the shared Tailwind config).

Each app’s `vite.config.ts` simply imports this preset and calls it.

---

#### 2.10 `@ataqu/test-utils`

Helpers for testing:

- `renderWithProviders(ui, options)` – wraps the component with all necessary providers (QueryClient, Zustand, I18n, etc.).
- `mockApiClient(handlers)` – sets up MSW to mock API responses.
- `createTestUser(overrides)` – generates a mock user.
- `waitFor` – re‑exported from `@testing-library/react`.

---

### 3. API Client Generation

**Approach:** The API client is **not** generated via OpenAPI. Instead, we provide the Rust source code (handlers, contracts, types) to the AI during task execution. The AI will parse the code and create a fully typed TypeScript client.

**The generated client package (`@ataqu/api-client`)** will contain:

- **`client.ts`** – a configured `fetch` instance with interceptors:
  - Adds `Authorization: Bearer <token>` from `useAuthStore`.
  - Adds `Idempotency-Key` header for mutating requests.
  - Transforms HTTP errors into `ApiError` objects.
- **`types.ts`** – all TypeScript interfaces derived from Rust structs.
- **Per‑domain modules** (`aegis/`, `cinq/`, etc.) – each exports functions for every endpoint:
  ```ts
  export const login = (data: LoginRequest) => api.post<LoginResponse>('/auth/login', data);
  export const getDeals = (params: DealFilters) => api.get<Deal[]>('/deals', { params });
  // etc.
  ```
- **Hooks** – pre‑built TanStack Query hooks:
  - `useLoginMutation`, `useDealsQuery`, `useCreateDealMutation`, etc.

**The generation script (`scripts/generate-api-client.ts`)** will:
1. Read the Rust source files (provided in the context or located at `../crates/ataqu-api/src/handlers/` and `../crates/ataqu-contracts/src/`).
2. Parse them to extract:
   - All routes (method, path, request body type, response type).
   - All structs/enums used in requests/responses.
3. Generate the TypeScript files inside `packages/api-client/src/`.
4. Ensure all types are exported and the client is ready for use.

**Important:** The generation is done **once** during TASK‑000. If the backend evolves later, we can create a separate task (TASK‑API‑UPDATE) to re‑run the generator.

---

### 4. Base Structure for Each App

For every app in `apps/` (aegis, cinq, dial, pivot, spark, tempo, sond, vault, pause, vista), create the following:

- `package.json` with dependencies:
  ```json
  {
    "name": "@ataqu/app-<name>",
    "private": true,
    "version": "0.0.1",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview",
      "test": "vitest"
    },
    "dependencies": {
      "@ataqu/api-client": "workspace:*",
      "@ataqu/types": "workspace:*",
      "@ataqu/ui": "workspace:*",
      "@ataqu/shared-hooks": "workspace:*",
      "@ataqu/shared-utils": "workspace:*",
      "@ataqu/shared-stores": "workspace:*",
      "@ataqu/shared-schemas": "workspace:*",
      "@ataqu/shared-i18n": "workspace:*",
      "react": "^19.2.7",
      "react-dom": "^19.2.7",
      "@tanstack/react-router": "latest",
      "@tanstack/react-query": "latest",
      "zustand": "^4.5.2"
    },
    "devDependencies": {
      "@ataqu/vite-preset": "workspace:*",
      "@ataqu/test-utils": "workspace:*",
      "vite": "^8.1.0",
      "vitest": "^2.0.0",
      "@vitejs/plugin-react": "^6.0.4",
      "typescript": "^7.0.0"
    }
  }
  ```

- `vite.config.ts`:
  ```ts
  import { defineViteConfig } from '@ataqu/vite-preset';
  export default defineViteConfig({ appName: '<name>' });
  ```

- `src/main.tsx`:
  ```tsx
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import { App } from './App';
  import '@ataqu/ui/styles.css';
  import './index.css';

  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
  ```

- `src/App.tsx`:
  ```tsx
  import { Shell } from '@ataqu/ui';
  import { RouterProvider } from '@tanstack/react-router';
  import { router } from './routes';

  export const App = () => (
    <Shell activeApp="<app-name>">
      <RouterProvider router={router} />
    </Shell>
  );
  ```

- `src/routes/__root.tsx` – root layout with all providers (QueryClient, Zustand, I18n, Onboard).
- `src/routes/index.tsx` – redirects to `/dashboard` if authenticated, else `/login`.
- `src/routes/login.tsx` – login page (uses `AuthLayout`, `useAuthStore`, and `login` mutation from API client).
- `src/routes/_auth.tsx` – protected layout with authentication guard.
- `src/routes/_auth/dashboard.tsx` – placeholder dashboard (just a heading).
- `src/routes/$.tsx` – 404 page.
- `src/index.css` – imports Tailwind directives.
- `.env.local` (optional) – for local development.

All routes use **TanStack Router** with code‑splitting (lazy loading of route components).

---

### 5. Testing Setup

- **Vitest** – unit and component tests.
  - `vitest.workspace.js` includes all packages and apps.
  - Example tests (in `packages/test-utils/__tests__/` and `apps/aegis/__tests__/`):
    - Button component render/click.
    - Auth store login/logout.
    - `useIdempotency` hook.
    - API client with MSW.

- **Playwright** – end‑to‑end tests.
  - `playwright.config.ts` configured for all 10 apps.
  - One E2E test per app: visits the app, checks that the shell renders, and navigates.

- **Coverage** – Vitest coverage enabled (using `@vitest/coverage-v8`).

---

### 6. CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/ci.yml` with:
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e` (on push to main or PR)

All steps must pass.

---

### 7. Documentation

- **Root README.md** – monorepo overview, setup instructions, commands.
- **Per‑package READMEs** – brief description, exports, usage example (at least for `ui`, `shared-hooks`, `shared-utils`, `api-client`).
- **Contributing guide** – naming conventions, commit message format, PR process.

---

## Success Criteria & Verification

After executing TASK‑000, the following must be true:

- [ ] `pnpm install` succeeds without errors.
- [ ] `pnpm dev` starts all 10 apps; each app loads and displays the unified shell with sidebar, header, and a placeholder dashboard.
- [ ] `pnpm build` builds all apps; each output bundle is **≤ 500 KB gzipped**.
- [ ] The command palette (`⌘ K`) is functional in every app, showing navigation links to other apps.
- [ ] The API client is generated and contains at least types and functions for one domain (e.g., AEGIS).
- [ ] The Lingui i18n setup works: translations are extracted and compiled; a simple `<Trans>` renders correctly.
- [ ] All tests (unit and E2E) pass.
- [ ] The GitHub Actions CI run is green.
- [ ] All files are named in **kebab-case** (except entry points like `main.tsx` or `vite.config.ts`).
- [ ] The design system (colors, typography, glassmorphism) is applied consistently in the shell.

---

## Execution Plan for the AI Agent

1. **Read context** – the agent receives:
   - This TASK‑000 spec.
   - The UI/UX master document (`ui-ux-master-doc.md`), visual identity guidelines, and the brand book (injected by `dispatch.sh`).
   - The Rust source code of handlers and contracts (to generate the API client).

2. **Create directories** – monorepo root, `apps/`, `packages/`, and all sub‑packages.

3. **Write configuration files** – `package.json`, `biome.json`, `tsconfig.base.json`, `pnpm-workspace.yaml`, `.env.example`, `vitest.workspace.js`, `playwright.config.ts`, `lingui.config.ts`.

4. **Develop each package** – implement the code for `@ataqu/types`, `tailwind-config`, `ui`, `shared-hooks`, `shared-utils`, `shared-stores`, `shared-schemas`, `shared-i18n`, `vite-preset`, and `test-utils`.

5. **Generate the API client** – run the `generate-api-client` script (or manually write the generated code) based on the Rust code provided.

6. **Scaffold the 10 apps** – for each app, create the directory, package.json, Vite config, and the minimal route structure.

7. **Add tests** – write example unit and E2E tests.

8. **Set up CI** – create `.github/workflows/ci.yml`.

9. **Write documentation** – root README and package READMEs.

10. **Final verification** – run all checks, fix any issues, and commit everything with a single commit: `feat(frontend): foundation kit & unified shell`.

---

## Notes

- The API client generation **does not** use any external tool; the AI reads the Rust code directly and writes the TypeScript files.
- All apps will be deployed as independent SPAs on subdomains (e.g., `crm.ataqu.so`); the shell uses `<a>` navigation to switch between them.
- The foundation is built once; subsequent frontend tasks (031–040) only add app‑specific pages and logic.

---

**End of TASK‑000 specification.**
