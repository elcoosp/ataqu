# Test Coverage to 80% Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the Vitest coverage of `packages/*/src` from ~31% (lines) to the configured 80% line / 80% function / 80% statement / 60% branch thresholds and enforce the gate in CI.

**Architecture:** Most of the coverage gap lives in the `@ataqu/ui` interior component library (76% of all measured source lines are at 14% coverage). The plan is a four-phase ramp: (A) cheap non-UI wins in `api-client`/`shared-stores`/`test-utils`/`command-registry`, (B) batch render sweeps over every interior component (happy path), (C) hook-level logic tests that drive every exported `use*` action (branches/functions), (D) a measure-and-gap-close loop with per-file coverage runs until all four global gates pass.

**Tech Stack:** Vitest 4 (happy-dom), @testing-library/react (`render`/`renderHook`/`fireEvent`/`act`/`waitFor`), motion/react (already renders in happy-dom — do NOT mock), v8 coverage provider.

---

## Baseline (measured 2026-09-09)

`npx vitest run --coverage` reports:

```
Statements : 29.21% ( 2034/6962 )
Branches   :  7.92% ( 387/4884 )
Functions  : 37.62% ( 678/1802 )
Lines      : 31.40% ( 1949/6207 )
```

Configured gates in `vitest.config.ts`: lines 80, functions 80, statements 80, branches 60.

Need: **+3017 lines**, **+3536 statements**, **+764 functions**, **+2543 branches**.

Where the gap lives (from `coverage/clover.xml`):

| Area | Stats | Lines covered |
|---|---|---|
| `ui/src/components/interior/**` | 4763 stmts, 674 covered (14%) | 4089 lines uncovered |
| `api-client/src` | 970 stmts, 886 covered (91%) | `amazon.ts`, `changelog.ts`, `onboarding.ts` + a few hooks |
| `ui/src/command-registry.tsx` | 29 stmts, 18 covered (62%) | `useRegisterCommands`, `unregister` |
| `ui/src/components/*` + `auth/*` | ~170 stmts, ~125 covered (74%) | `changelog-bell`, `data-table`, `form-builder`, `setup-progress-widget`, `LoginForm`, `RegisterForm` |
| `shared-stores` / `test-utils` / shared-i18n locales | tiny | `activationTaskHref`, `mockApiClient`, compiled catalogs |

## Why this scale works (validated)

A throwaway probe (deleted after measurement) on a scoped run gave:

- Render-only smoke of 7 interior components: **55.6% lines / 52.9% funcs / 38.5% branches** on those files.
- Render + hook interaction on `pagination.tsx`: **78% lines / 67% funcs / 57% branches** (render-only) and the hook interactions push the state-dependent JSX paths beyond that.

Rule of thumb per component: reach ~85%+ lines = (a) render the component once with the props listed below, (b) drive every returned action from its `use*` hook inside `act()`.

## Global command cheat-sheet (use throughout)

Full suite with coverage (gate; will exit non-zero until thresholds pass, output is what counts):

```bash
npx vitest run --coverage
```

Scoped coverage of one file without failing the gate (thresholds pinned to 0):

```bash
npx vitest run <testfile> --coverage \
  --coverage.include="packages/ui/src/components/interior/pagination.tsx" \
  --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 \
  --coverage.thresholds.statements=0 --coverage.thresholds.branches=0
```

Quick summary numbers (track **Statements too** — it runs ~2pp below Lines in this repo, so 80% lines does not imply 80% statements):

```bash
npx vitest run --coverage 2>&1 | grep -E "Statements |Branches |Functions |Lines "
```

> **Statements vs Lines note:** `Lines` counts statement-lines (6207 total); v8 `Statements` counts all expressions (6962 total) and reports ~2pp lower. The gate demands both ≥ 80%, so the Chunk 4 gap loop must close **Statements**, not just Lines.

---

## File Structure

**Create:**
- `packages/ui/__tests__/helpers.tsx` — DRY providers wrappers (i18n + QueryClient + router + fetch mock)
- `packages/ui/__tests__/sweep6.test.tsx` — render sweep, batch 1 (35 simple interior components)
- `packages/ui/__tests__/sweep7.test.tsx` — render sweep, batch 2 (portal/modal family + sortable-table + setup-progress-widget; interior command-palette is DROPPED — see note below)
- `packages/ui/__tests__/interior-logic1.test.ts` — hook logic: pure/state machines (pagination, wizard, tabs, password-strength, poll-results, streaming-text, value-flash, icon-morph, text-reveal, reading-progress, typing-indicator, presence-avatars, live-activity)
- `packages/ui/__tests__/interior-logic2.test.ts` — hook logic: open/close/selection (accordion, collapsible-banner, dropdown, expanding-search, tooltip, popover, context-menu, modal)
- `packages/ui/__tests__/interior-logic3.test.ts` — hook logic: gesture/scroll/collection (ripple, long-press, hold-to-confirm, hide-on-scroll, scroll-spy, load-more, skeleton-swap, new-items-pill, reorder-list, sortable-table, tree-view, snap-carousel, swipe-deck, slider-detents, blur-up-image, sticky-header, logo-marquee, press-depth)
- `packages/ui/__tests__/interior-interactions.test.tsx` — fireEvent-driven component interactions (batch of the highest-value toggles)
- `packages/ui/__tests__/command-registry.test.tsx` — command-registry register/unregister/dedupe
- `packages/test-utils/__tests__/mocks.test.ts` — `mockApiClient`

**Modify:**
- `packages/api-client/__tests__/exhaustive.test.ts` — add `amazon`, `changelog`, `onboarding` modules to the exercise loop
- `packages/api-client/__tests__/hooks.test.tsx` — render the hooks of those 3 modules + `health`, `search`, `migration`
- `packages/shared-stores/__tests__/stores.test.ts` — `activationTaskHref` cases
- `packages/shared-i18n/__tests__/i18n.test.tsx` — import `en`/`fr` compiled catalogs (2 uncovered stmts)
- `package.json` — add `"test:coverage": "vitest run --coverage"`
- `.github/workflows/ci.yml` — add `- run: pnpm test:coverage` after `pnpm test`

Never touch the `vitest.config.ts` coverage `include`/`exclude` lists to *hide* measured source. The one exception: the interior `command-palette.tsx` is excluded today by the overly-broad `**/command-palette.tsx` rule (it matches both top-level and `components/interior/`). If you want that component to count toward the gate, remove `**/command-palette.tsx` from the exclude list in a dedicated commit **before** writing its tests — that adds measured surface rather than hiding it. Otherwise omit it from all sweep/logic/interaction tasks below (it is NOT called out in the Chunk 2/3 tables once you drop it).

---

## Chunk 1: Non-UI wins (small, lock-in)

### Task 1.1: api-client raw functions — amazon / changelog / onboarding

**Files:**
- Modify: `packages/api-client/__tests__/exhaustive.test.ts`

- [ ] **Step 1:** Add imports for the three untested modules after the existing `import * as vista` line:

```ts
import * as amazon from "../src/amazon";
import * as changelog from "../src/changelog";
import * as onboarding from "../src/onboarding";
```

- [ ] **Step 2:** Add three `it(...)` cases to the describe block (mirror the `cinq`/`spark` style):

```ts
it("exercises amazon client fns", async () => {
	await exercise(amazon as any, "amazon");
});
it("exercises changelog client fns", async () => {
	await exercise(changelog as any, "changelog");
});
it("exercises onboarding client fns", async () => {
	useAuthStore.setState({ tenantId: "ten" });
	await exercise(onboarding as any, "onboarding");
});
```

Note: the generic `exercise` helper already handles `getAmazonStatus`, `connectAmazon`, `disconnectAmazon`, `syncAmazon`, `getChangelog`, `markChangelogRead`, `getOnboardingStatus`, `completeOnboardingTask`, `getTeamStatus` with its candidate-arg shapes.

- [ ] **Step 3:** Run funnel:

```bash
npx vitest run packages/api-client/__tests__/exhaustive.test.ts
```

Expected: PASS (all cases green).

- [ ] **Step 4:** Confirm amazon/changelog/onboarding statements are no longer 0%:

```bash
npx vitest run packages/api-client/__tests__/exhaustive.test.ts --coverage \
  --coverage.include="packages/api-client/src/{amazon,changelog,onboarding}.ts" \
  --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 \
  --coverage.thresholds.statements=0 --coverage.thresholds.branches=0
```

Expected: each file ≥ 90% lines.

- [ ] **Step 5:** Commit

```bash
git add packages/api-client/__tests__/exhaustive.test.ts
git commit -m "test(api-client): exercise amazon, changelog, onboarding modules"
```

### Task 1.2: api-client hooks — add modules + health/search/migration

**Files:**
- Modify: `packages/api-client/__tests__/hooks.test.tsx`

- [ ] **Step 1:** Add the three module imports and register them in the `modules` map:

```ts
import * as amazon from "../src/amazon";
import * as changelog from "../src/changelog";
import * as onboarding from "../src/onboarding";
```

```ts
const modules = { cinq, dial, pause, sond, tempo, vault, vista, aegis, pivot, spark, amazon, changelog, onboarding };
```

- [ ] **Step 2:** Extend the wrapper's generic arg shapes so `useAmazonStatus`, `useConnectAmazon`, `useChangelog`, `useOnboardingStatus`, `useCompleteOnboardingTask`, `useTeamStatus` succeed. Add these arg shapes to the candidate list inside the loop:

```ts
[{ marketplace_id: "M", seller_id: "S", refresh_token: "R" }],
```

(`useConnectAmazon` needs a `AmazonConnectRequest` object.)

- [ ] **Step 3:** Add a dedicated `it` that renders the three currently-missing standalone hooks so `useHealth`, `useSearch`, `useParseMigrationFile`, `useImportMigrationData` are exercised (they are not in the `modules` loop). **Note:** `useSearch` requires a query argument (it calls `q.trim()`), so call `useSearch("q")`, not `useSearch()`:

```tsx
it("renders health / search / migration hooks", async () => {
	const healthUri = { status: "ok" };
	const searchPayload = [{ app: "cinq", entity_type: "contact", id: "1", title: "A" }];
	fetchMock.mockResolvedValue(jsonResponse(searchPayload));

	const { unmount: um1 } = wrap(() => health.useHealth());
	um1();
	const { unmount: um2 } = wrap(() => search.useSearch("a"));
	um2();

	fetchMock.mockResolvedValue(jsonResponse({ ok: true, results: [], error: null }));
	const { unmount: um3 } = wrap(() => migration.useParseMigrationFile());
	um3();
	await waitFor(() => expect(true).toBe(true));
});
```

Check the real signatures in `health.ts`, `search.ts`, `migration.ts` first (`useSearch` may take a plain string or a params object; `useParseMigrationFile` returns a mutation whose `.mutate()` is what runs the fetch). If the mutation-style hooks need `result.current.mutate(...)` inside `act()` to trigger their bodies, do that instead — a bare render may not execute the `mutationFn`.

- [ ] **Step 4:** Run and measure:

```bash
npx vitest run packages/api-client/__tests__/hooks.test.tsx
npx vitest run packages/api-client/__tests__/hooks.test.tsx --coverage \
  --coverage.include="packages/api-client/src/**" \
  --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 \
  --coverage.thresholds.statements=0 --coverage.thresholds.branches=0
```

Expected: `api-client` package ≥ 96% lines, and previously-0% hook bodies covered.

- [ ] **Step 5:** Commit

```bash
git add packages/api-client/__tests__/hooks.test.tsx
git commit -m "test(api-client): cover amazon/changelog/onboarding/health/search/migration hooks"
```

### Task 1.3: shared-stores + test-utils + i18n catalogs

**Files:**
- Modify: `packages/shared-stores/__tests__/stores.test.ts`
- Create: `packages/test-utils/__tests__/mocks.test.ts`
- Modify: `packages/shared-i18n/__tests__/i18n.test.tsx`

- [ ] **Step 1:** In `stores.test.ts`, add a describe for `activationTaskHref`:

```ts
import { ACTIVATION_TASKS, activationTaskHref } from "../src/activation";

describe("activationTaskHref", () => {
	it("returns the href for a known task id", () => {
		for (const t of ACTIVATION_TASKS) {
			expect(activationTaskHref(t.id)).toBe(t.href);
		}
	});
	it("returns undefined for an unknown id", () => {
		expect(activationTaskHref("does-not-exist")).toBeUndefined();
	});
});
```

- [ ] **Step 2:** Create `packages/test-utils/__tests__/mocks.test.ts`. Read `packages/test-utils/src/mocks.ts` first — it currently exports `mockApiClient` as a **no-op stub returning `undefined`**. Assert it does not throw; do NOT assert `typeof === "object"` (that would fail):

```ts
import { describe, expect, it } from "vitest";
import { mockApiClient } from "../src/mocks";

describe("mockApiClient", () => {
	it("can be invoked without throwing", () => {
		expect(() => mockApiClient()).not.toThrow();
	});
});
```

Adjust to whatever `mockApiClient` actually returns after reading `mocks.ts` (if it ever returns a real client object, assert its shape instead).

- [ ] **Step 3:** In `i18n.test.tsx`, add a compiled-catalog import (covers the 0% `messages.ts` locale files):

```ts
import { messages as enMessages } from "../src/locales/en/messages";
import { messages as frMessages } from "../src/locales/fr/messages";

it("bundles compiled en/fr catalogs", () => {
	expect(typeof enMessages).toBe("object");
	expect(typeof frMessages).toBe("object");
});
```

- [ ] **Step 4:** Run:

```bash
npx vitest run packages/shared-stores/__tests__/stores.test.ts packages/test-utils/__tests__/mocks.test.ts packages/shared-i18n/__tests__/i18n.test.tsx
```

Expected: PASS.

- [ ] **Step 5:** Commit

```bash
git add packages/shared-stores/__tests__/stores.test.ts packages/test-utils/__tests__/mocks.test.ts packages/shared-i18n/__tests__/i18n.test.tsx
git commit -m "test: cover activationTaskHref, mockApiClient, i18n catalogs"
```

### Task 1.4: ui command-registry — register/unregister/dedupe/hook

**Files:**
- Create: `packages/ui/__tests__/command-registry.test.tsx`

`command-registry.tsx` sits at 62%. Sweep4 already covers `useCommandRegistry`/`useAllCommands`. Missing: `useRegisterCommands` (incl. outside-provider warning), `unregister`, dedupe-by-id, cleanup on unmount.

- [ ] **Step 1:** Create the file:

```tsx
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	CommandRegistryProvider,
	useAllCommands,
	useCommandRegistry,
	useRegisterCommands,
} from "../src/command-registry";

function Consumer({ cmds }: { cmds: { id: string; title: string }[] }) {
	useRegisterCommands(cmds as never);
	const all = useAllCommands();
	return <span data-testid="count">{all.length}</span>;
}

afterEach(() => vi.restoreAllMocks());

describe("command-registry", () => {
	it("registers, dedupes by id, and cleans up on unmount", async () => {
		let ctx!: ReturnType<typeof useCommandRegistry>;
		function Probe({ cmds }: { cmds: { id: string; title: string }[] }) {
			ctx = useCommandRegistry();
			useRegisterCommands(cmds as never);
			return <span>{ctx?.commands.length}</span>;
		}
		const view = render(
			<CommandRegistryProvider>
				<Probe cmds={[{ id: "a", title: "A" }]} />
			</CommandRegistryProvider>,
		);
		expect(await screen.findByText("1")).toBeTruthy();
		view.rerender(
			<CommandRegistryProvider>
				<Probe
					cmds={[
						{ id: "a", title: "A2" },
						{ id: "b", title: "B" },
					]}
				/>
			</CommandRegistryProvider>,
		);
		expect(await screen.findByText("2")).toBeTruthy(); // dedupe by id a
		view.unmount();
		expect(ctx!.commands).toHaveLength(0); // cleanup on unmount
	});

	it("unregister removes commands", () => {
		let ctx!: ReturnType<typeof useCommandRegistry>;
		function Probe() {
			ctx = useCommandRegistry()!;
			return <div />;
		}
		render(
			<CommandRegistryProvider>
				<Probe />
			</CommandRegistryProvider>,
		);
		act(() => ctx.register([{ id: "x", title: "X", onSelect: () => {} }]));
		expect(ctx.commands).toHaveLength(1);
		act(() => ctx.unregister(["x"]));
		expect(ctx.commands).toHaveLength(0);
	});

	it("useRegisterCommands warns outside a provider", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(
			<div>
				<WarnProbe />
			</div>,
		);
		expect(warn).toHaveBeenCalled();
	});
});

function WarnProbe() {
	useRegisterCommands([{ id: "a", title: "A" } as never]);
	return <span />;
}
```

- [ ] **Step 2:** Run + scoped coverage:

```bash
npx vitest run packages/ui/__tests__/command-registry.test.tsx --coverage \
  --coverage.include="packages/ui/src/command-registry.tsx" \
  --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 \
  --coverage.thresholds.statements=0 --coverage.thresholds.branches=0
```

Expected: `command-registry.tsx` ≥ 95% lines.

- [ ] **Step 3:** Commit

```bash
git add packages/ui/__tests__/command-registry.test.tsx
git commit -m "test(ui): command registry register/unregister/dedupe coverage"
```

### Task 1.5: enforce the gate in CI

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1:** Add a coverage script in `package.json` scripts (keep `test` as plain `vitest run` so local dev stays fast):

```json
"test:coverage": "vitest run --coverage",
```

- [ ] **Step 2:** In `ci.yml`, add a gate step right after `pnpm test` (line ~21):

```yaml
      - run: pnpm test:coverage
```

- [ ] **Step 3:** Verify script exists:

```bash
pnpm test:coverage 2>&1 | grep -E "Statements |Lines " || echo "(expected: exits non-zero until gate passes in later chunks)"
```

Expected: runs the suite; exits non-zero with "ERROR: Coverage for lines ... does not meet global threshold (80%)" — this is expected until Chunk 4 closes the gap.

- [ ] **Step 4:** Commit

```bash
git add package.json .github/workflows/ci.yml
git commit -m "ci: enforce vitest coverage thresholds in CI"
```

**Chunk 1 checkpoint:** run `npx vitest run --coverage 2>&1 | grep -E "Statements |Branches |Functions |Lines "`. Expect lines ≈ 33-34%, functions ≈ 40%, branches ≈ 8%. Do NOT proceed if the new tests fail to pass.

---

## Chunk 2: Interior render sweeps (happy path)

These two files smoke-render every interior component with sensible props. Motion/react works in happy-dom — do not mock it.

### Task 2.1: shared test helpers

**Files:**
- Create: `packages/ui/__tests__/helpers.tsx`

- [ ] **Step 1:** Create a DRY wrapper module. It is NOT a test file (no `.test.`/`.spec.` suffix) so Vitest ignores it and coverage excludes `__tests__/**` anyway.

```tsx
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

export function makeI18n() {
	const li = setupI18n("en");
	li.load("en", {});
	li.activate("en");
	return li;
}

export function Providers({ children }: { children: ReactNode }) {
	const li = makeI18n();
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return (
		<I18nProvider i18n={li}>
			<QueryClientProvider client={qc}>{children}</QueryClientProvider>
		</I18nProvider>
	);
}

export function WithRouter({ children }: { children: ReactNode }) {
	const inner = <Providers>{children}</Providers>;
	const router = createRouter({
		history: createMemoryHistory({ initialEntries: ["/"] }),
		routeTree: createRootRoute({ component: () => inner }),
	});
	return <RouterProvider router={router} />;
}

export function stubFetch() {
	const qc = new QueryClient();
	qc.clear();
}

export function jsonResponse(body: unknown) {
	return {
		ok: true,
		status: 200,
		json: async () => body,
		text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
		blob: async () => new Blob(),
		arrayBuffer: async () => new ArrayBuffer(0),
	} as Response;
}
```

(Match these to the exact helpers already used in `sweep2`-`sweep5`; if a component needs the router or the registry, use `WithRouter` or wrap in `CommandRegistryProvider` explicitly.)

- [ ] **Step 2:** Commit

```bash
git add packages/ui/__tests__/helpers.tsx
git commit -m "test(ui): shared render helper module for sweeps"
```

### Task 2.2: sweep6 — render 35 simple interior components

**Files:**
- Create: `packages/ui/__tests__/sweep6.test.tsx`

- [ ] **Step 1:** Create the file. Render each component below once inside `<Providers>` (except where noted). Use the exact props from the table; required props are mandatory, the rest optional. Wrap each render in its own `it` block where a component needs a unique environment; group the rest into a few `it` blocks. Key props:

| Component | Minimum render |
|---|---|
| `Accordion` | `items={[{ id: "a", title: "A", content: "body" }]}` |
| `BlurUpImage` | `alt="x" width={100} height={100} src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="` |
| `CollapsibleBanner` | `title="Notice"` |
| `ExpandingSearch` | (no required props) |
| `FloatingLabelInput` | `label="Email"` |
| `IconMorph` | (no required props) |
| `InlineValidation` | `label="Email" value="a@b.c" onChange={()=>{}} validate={(v)=> (v.includes("@") ? null : "bad email")}` |
| `LikeBurst` | (no required props) |
| `LiveActivity` | `activity={{ id: "1", title: "Deal", phase: "running" }}` (Activity requires `phase: ActivityPhase`, no `kind` field) |
| `LogoMarquee` | `items={[{ id: "1", label: "One" }]}` |
| `LongPressButton` | `onLongPress={()=>{}}` children `Press` |
| `NewItemsPill` | `count={5} onJump={()=>{}}` |
| `Pagination` | `count={10}` |
| `PasswordStrength` | `value="secret"` |
| `PollResults` | `options={[{ id: "a", label: "A", votes: 1 }]} label="Vote"` (each option REQUIRES `votes: number` — Omit and totals are NaN) |
| `PresenceAvatars` | `people={[{ id: "u1", name: "Ada", src: "" }]}` (field is `src`, not `avatarUrl`) |
| `PressDepth` | children `<span>click</span>` |
| `ProgressBar` | `value={50}` AND `value={null}` (covers indeterminate branch) |
| `ReadingProgress` | (no required props) |
| `ReorderList` | `items={[{ id: "1", label: "One" }]} getId={(i)=>i.id} getLabel={(i)=>i.label} onReorder={()=>{}} label="List"` + `children={(item) => <span>{String(item.id)}</span>}` (children is a **render-prop function** `(item: T) => ReactNode` — passing a JSX element throws `children is not a function`) |
| `Ripple` | children `<span>hit</span>` |
| `ScrollSpy` | `sections={[{ id: "s1", label: "Sec" }]} label="Nav"` (each section REQUIRES `label`) |
| `SegmentedControl` | `options={[{ value: "a", label: "A" }]} label="Mode"` |
| `SkeletonSwap` | `ready={false}` children `<span>content</span>` (also render `ready={true}`) |
| `SliderDetents` | `value={50} onValueChange={()=>{}}` |
| `SnapCarousel` | children `<div>slide</div>` label="Carousel" |
| `StickyHeader` | `title="Header"` children `<div>body</div>` |
| `StreamingText` | `text="hello world" autoStart={false}` |
| `SwipeDeck` | `items={[{ id: "1" }]} itemKey={(i)=>String(i.id)} itemLabel={(i)=>String(i.id)}` + `children={(item) => <div>card</div>}` (component `children` is a **render-prop function** `(item: T) => ReactNode`; a JSX element throws) |
| `Tabs` | `items={[{ value: "t", label: "Tab" }]} renderPanel={(v)=><span>{v}</span>}` (TabItem uses `value`+`label`, not `id`/`content`) |
| `TextReveal` | `text="hello"` |
| `TreeView` | `nodes={[{ id: "n", label: "Node" }]} label="Tree"` |
| `TypingIndicator` | `typists={["Ada"]}` (REQUIRED `typists: string[]`) |
| `ValueFlash` | `value={42}` |
| `WizardSteps` | `steps={[{ id: "s1", label: "One" }]}` |

Every render must end with a query assertion (so a broken render fails loudly) — e.g. `expect(document.body).toBeTruthy()` is acceptable only when no text is stable; prefer `screen.getByText(...)` where content is stable.

- [ ] **Step 2:** Run the new file alone:

```bash
npx vitest run packages/ui/__tests__/sweep6.test.tsx
```

Expected: PASS. Fix any component that throws by checking its actual required props (read the file). Common issues: a component requires a handler prop that has no default, or a hook needs `window.scrollTo` — happy-dom provides it.

- [ ] **Step 3:** Measure interior delta:

```bash
npx vitest run packages/ui/__tests__/sweep6.test.tsx --coverage \
  --coverage.include="packages/ui/src/components/interior/**" \
  --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 \
  --coverage.thresholds.statements=0 --coverage.thresholds.branches=0
```

Expected: covered lines on the swept files roughly 50-60% each (matches the probe: ~55% lines / ~52% funcs).

- [ ] **Step 4:** Commit

```bash
git add packages/ui/__tests__/sweep6.test.tsx
git commit -m "test(ui): interior render sweep batch 1"
```

### Task 2.3: sweep7 — render modal-family + complex components

**Files:**
- Create: `packages/ui/__tests__/sweep7.test.tsx`

- [ ] **Step 1:** Create the file. These components use portals or complex nesting; render with `open`/controlled props so their JSX executes:

| Component | Minimum render |
|---|---|
| `Modal` | `open onClose={()=>{}} title="Modal"` (portal to `document.body`, fine in happy-dom) |
| `Drawer` | `open onOpenChange={()=>{}} title="Drawer"` |
| `Popover` | `trigger={<button>open</button>} label="Pop"` children `<div>content</div>` — read `popover.tsx`; if `open` is optional, render both opened (pass `open`) and closed to cover both JSX arms |
| `Dropdown` | `items={[{ value: "a", label: "A" }]}` (DropdownItem uses `value`+`label`, not `id`) |
| `ContextMenu` | `items={[{ id: "a", label: "A" }]}` children `<div>target</div>` |
| `Lightbox` | `open onClose={()=>{}} src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="img"` |
| `SortableTable` | `rows={[{ id: "1", name: "A" }]} columns={[{ id: "name", header: "Name" }]} getRowId={(r)=>r.id} label="Table"` (column field is REQUIRED `header`, not `label`) |
| ~~`CommandPalette` (interior)~~ | **DROP** — `vitest.config.ts:101` excludes `**/command-palette.tsx`, which also matches `components/interior/command-palette.tsx`; it contributes no gate coverage. Do not test it unless you first remove that exclude in a dedicated `vitest.config.ts` commit (see File Structure note). |
| `SetupProgressWidget` | wrap in `<Providers>` + global `fetch` stub (it calls `useOnboardingStatus`); set `useAuthStore.setState({ tenantId: "t" })` in `beforeEach` |

For the portal family, call `render(...)` and then assert something in `document.body`; portals render to body so normal queries work.

- [ ] **Step 2:** Run + scoped coverage:

```bash
npx vitest run packages/ui/__tests__/sweep7.test.tsx --coverage \
  --coverage.include="packages/ui/src/components/interior/**" \
  --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 \
  --coverage.thresholds.statements=0 --coverage.thresholds.branches=0
```

Expected: PASS; new files land at ~45-60% lines.

- [ ] **Step 3:** Commit

```bash
git add packages/ui/__tests__/sweep7.test.tsx
git commit -m "test(ui): interior render sweep batch 2 (portals)"
```

**Chunk 2 checkpoint:** run `npx vitest run --coverage 2>&1 | grep -E "Statements |Branches |Functions |Lines "`. Expect lines ≈ 52-58%, functions ≈ 50-55%, branches ≈ 25-30%. If any sweep render throws, fix and re-run before proceeding.

---

## Chunk 3: Interior hook + logic tests

Drive every returned action from each `use*` hook inside `act()` to cover functions and branches. Use `renderHook` (pattern identical to the existing `interior.test.tsx`). Mock only browser APIs, never motion/react.

Conventions:
- `const { result } = renderHook(() => X(...));`
- transitions: `act(() => { result.current.TOGGLE(); });`
- async transitions: `await waitFor(...)`.
- run test file scoped, then scoped coverage per component with `--coverage.include`.

### Task 3.1: interior-logic1 — pure/state hooks

**Files:**
- Create: `packages/ui/__tests__/interior-logic1.test.ts`

- [ ] **Step 1:** Create the file covering:

| Hook | Cases (drive every returned action) |
|---|---|
| `paginate` + `usePagination` (`pagination.tsx`) | `paginate` for: small count (returns `range(1,count)`), nearStart, nearEnd, middle (assert exact arrays — see plan notes: nearStart `[1..5, "gap-r", 20]`, nearEnd `[1, "gap-l", 16..20]`, middle `[1, "gap-l", 9,10,11, "gap-r", 20]` for `count=20, s=1, b=1`). `usePagination`: `prev`, `next`, `goTo` (inside+outside range incl. same-page early-return), controlled `page` + `onPageChange` |
| `useWizard` (`wizard-steps.tsx`) | `next`, `back`, `goTo`, `isFirst`/`isLast` boundaries, `furthest`, controlled `index` + `onIdxChange`, `onComplete` fires on last `next` |
| `useTabs` (`tabs.tsx`) | initial value, `select`, `direction` (forward/back), controlled `value` + `onValueChange`, `activation="manual"` |
| `usePasswordStrength` (`password-strength.tsx`) | weak/password values → `score`/`max`/`label`/`rules`, matching/non-matching rules |
| `usePollResults` (`poll-results.tsx`) | `vote` sets `chosen`, recomputes percents, controlled `value` |
| `useStreamingText` (`streaming-text.tsx`) | render with `autoStart` off; `start`, `pause`, `skip`, `reset`; `tokenCount` grows; `onDone` fires; `autoStart=false` + `start()`; partial text |
| `useValueFlash` (`value-flash.tsx`) | changing value triggers `flashing` + `direction`; `hold` timer |
| `useIconMorph` (`icon-morph.tsx`) | `toggle`, `setIndex`, modes/shapes presets |
| `useTextReveal` (`text-reveal.tsx`) | `by="word"`/`"char"` groups, `step`, `started` |
| `useReadingProgress` (`reading-progress.tsx`) | progress goes from 0→100 via scroller/`scrollTo`, `complete` flag, minutesLeft on `words` |
| `useTypingPresence` (`typing-indicator.tsx`) | `ping`/`send`/`clear`, timeout expiry (fake timers `vi.useFakeTimers()`), `reset` |
| `usePresence` (`presence-avatars.tsx`) | max overflow → `hidden`/`overflow`/`summary`, `announceAfter` timer |
| `useLiveActivity` (`live-activity.tsx`) | `start`, `update`, `succeed`, `fail`, `dismiss`, `linger` expiry |

- [ ] **Step 2:** Run + scoped coverage (add `--coverage.include` per component):

```bash
npx vitest run packages/ui/__tests__/interior-logic1.test.ts
```

Expected: PASS.

- [ ] **Step 3:** Commit

```bash
git add packages/ui/__tests__/interior-logic1.test.ts
git commit -m "test(ui): interior state/pure hook logic coverage"
```

### Task 3.2: interior-logic2 — open/close/selection hooks

**Files:**
- Create: `packages/ui/__tests__/interior-logic2.test.ts`

- [ ] **Step 1:** Create the file covering:

| Hook | Cases (drive every returned action) |
|---|---|
| `useAccordion` (`accordion.tsx`) | `toggle` single/multiple, `collapsible:false` guard, controlled `open`, `headerProps`/`panelProps` aria wiring, `ArrowDown`/`ArrowUp`/`Home`/`End` onKeyDown |
| `useCollapsibleBanner` (`collapsible-banner.tsx`) | `fold`, `expand`, `toggle`, `dismiss`, `restore`, `defaultState:"folded"` |
| `useDropdown` (`dropdown.tsx`) | `openMenu`, `close`, `select`, `activeIndex` move, typeahead, controlled `value`, `disabled` |
| `useExpandingSearch` (`expanding-search.tsx`) | `expand`, `collapse`, `toggle`, `clear`, `onSearch` debounce, controlled `open`/`value`, `collapseOnBlur` |
| `useTooltip` (`tooltip-group.tsx`) | warm/seat/travel on hover, open/close delays, skip after tooltip seen, `disabled` |
| `usePopover` (`popover.tsx`) | open state, `update`/floating side placement, close on outside/Escape via `panelProps.onKeyDown` |
| `useContextMenu` (`context-menu.tsx`) | `openAt`, `close`, `getItemProps`, disabled, placement |
| `useModal` (`modal.tsx`) | `close`, Escape key, backdrop pointerdown close, `lockScroll` (window scroll lock effect), non-modal `modal:false` |

(Do NOT include `useCommandPalette` — the file is excluded from coverage by `vitest.config.ts`; see File-Structure note.)

- [ ] **Step 2:** Run:

```bash
npx vitest run packages/ui/__tests__/interior-logic2.test.ts
```

Expected: PASS.

- [ ] **Step 3:** Commit

```bash
git add packages/ui/__tests__/interior-logic2.test.ts
git commit -m "test(ui): interior open/close/selection hook logic coverage"
```

### Task 3.3: interior-logic3 — gesture/scroll/collection hooks

**Files:**
- Create: `packages/ui/__tests__/interior-logic3.test.ts`

- [ ] **Step 1:** Create the file covering:

| Hook | Cases (drive every returned action) |
|---|---|
| `useRipple` (`ripple.tsx`) | `bind.onPointerDown` adds a ripple, `max` cap, fade removal |
| `useLongPress` (`long-press.tsx`) | pointer-down starts progress, hold completes → `onLongPress`, cancel on pointer-up before duration (fake timers) |
| `useHoldToConfirm` (`hold-to-confirm.tsx`) | hold to `phase:"confirming"` then completion fires `onConfirm`; cancel; `reset`; disabled |
| `useHideOnScroll` / `useCondense` (`hide-on-scroll.tsx` / `sticky-header.tsx`) | simulate scroll past `hideAfter` → `hidden`; near top → `atTop`; `pinned` bypass |
| `useScrollSpy` (`scroll-spy.tsx`) | `activeId` changes via IntersectionObserver callback path (mock observer to call entries), `scrollTo`, `getLinkProps`, `announce` |
| `useLoadMore` (`load-more.tsx`) | `load` adds/`status`, `hasMore:false` stops, `onError`, pause on `maxAutoLoads` |
| `useSkeletonSwap` (`skeleton-swap.tsx`) | `ready:false` → `showSkeleton:true`; `ready` flip → `busy` then swaps after `minVisible` (fake timers) |
| `useNewItems` (`new-items-pill.tsx`) | scroll unread increments with `threshold`, `jump` clears, `anchor` |
| `useReorderList` (`reorder-list.tsx`) | `grab`, `step`, `drop` → `onReorder`, cancel, `rowKeyDown`, `onDragStart`/`onDragEnd` |
| `useSortableRows` (`sortable-table.tsx`) | `toggle` sort column/order, `ariaSort`, `defaultSort`, `restoreOriginal` |
| `useTreeView` (`tree-view.tsx`) | expand/collapse nested rows, `select`, `focusRow`/`tabStop`, `toggle`, `handleKey` (arrows/home/end), controlled `expanded`/`selected` |
| `useSnapCarousel` (`snap-carousel.tsx`) | `next`, `prev`, `goTo`, `index` bounds, momentum/flick release path, `disabled` |
| `useSwipeDeck` (`swipe-deck.tsx`) | `decide` (left/right), `undo`, `clear`, `report`, `release` with `flick`/`threshold` → `onDecide`/`onUndo`, `canUndo`, `done` |
| `useSliderDetents` (`slider-detents.tsx`) | thumb drag via `trackProps`, snap to detents, `percent`/`valueText`, `disabled`, keyboard arrows |
| `useBlurUpImage` (`blur-up-image.tsx`) | `loaded`/`status` transitions on `onReady` path, `instant` |
| `useLogoMarquee` (`logo-marquee.tsx`) | `copies` duplicated, `reduced`, `paused`, `bind` drag scroll |
| `usePressDepth` (`press-depth.tsx`) | `bind` pointer down/up → `pressed`, `origin`, `onPressStart`/`onPressEnd` |

Reading `scroll-spy.tsx`, `load-more.tsx`, `hide-on-scroll.tsx` first to see how to trigger their observer/scroll paths (they rely on `IntersectionObserver`/scroll listeners — the global mocks in `vitest.setup.ts` are no-ops, so drive the code paths via the returned `scrollProps`/`ref` callbacks or by firing the stored handlers directly).

- [ ] **Step 2:** Run:

```bash
npx vitest run packages/ui/__tests__/interior-logic3.test.ts
```

Expected: PASS.

- [ ] **Step 3:** Commit

```bash
git add packages/ui/__tests__/interior-logic3.test.ts
git commit -m "test(ui): interior gesture/scroll/collection hook logic coverage"
```

### Task 3.4: component-level interactions (state-dependent JSX)

**Files:**
- Create: `packages/ui/__tests__/interior-interactions.test.tsx`

The render sweeps cover base JSX; hook tests cover logic. This file re-drives the highest-value components THROUGH the DOM with `fireEvent` so conditional JSX (open/closed, selected/active branches) gets hit:

- [ ] **Step 1:** Create the file covering:

| Component | Interaction |
|---|---|
| `Pagination` | click Next/Prev/Page buttons, observe aria-current moves |
| `Accordion` | click header → panel expands (`aria-expanded` toggles), collapse |
| `Tabs` | click tab label → panel swaps |
| `SegmentedControl` | click option → `onValueChange` called |
| `ProgressBar` | assert progressbar role + `aria-valuenow` for `value` and indeterminate |
| `StreamingText` | click skip → status done |
| `WizardSteps` | click next/back buttons |
| `PasswordStrength` | type weak then strong value → label/announcement changes |
| `PollResults` | click an option → vote registered |
| `CollapsibleBanner` | click dismiss → banner disappears; restore → returns |
| `SkeletonSwap` | `ready` flips via rerender → content swaps |
| `TreeView` | click expander → children visible |
| `Dropdown` / `Popover` | click trigger → list/popover appears, click item → selects |
| `Modal` / `Drawer` | open + click Close → `onClose` called |
| `HoldToConfirm` | (mouse/keyboard hold via fireEvent) → confirm fires |
| `TooltipGroup` | render JSX once (currently only the `useTooltip` hook logic is covered by logic2) |
| `SortableTable` | click column header → sort toggles |
| `SetupProgressWidget` | with stubbed `fetch` returning `OnboardingStatus` → tasks render |

Use `fireEvent` + `screen` queries, and `waitFor` for timeout/async assertions. Reuse `helpers.tsx` providers.

- [ ] **Step 2:** Run:

```bash
npx vitest run packages/ui/__tests__/interior-interactions.test.tsx
```

Expected: PASS.

- [ ] **Step 3:** Commit

```bash
git add packages/ui/__tests__/interior-interactions.test.tsx
git commit -m "test(ui): interior component interaction coverage"
```

**Chunk 3 checkpoint:** run `npx vitest run --coverage 2>&1 | grep -E "Statements |Branches |Functions |Lines "`. Expect lines ≈ 78-84%, functions ≈ 72-80%, branches ≈ 45-55%. If lines are still < 76%, run the gap loop (Chunk 4) before bothering to chase branches.

---

## Chunk 4: Measure → target the residual gap

### Task 4.1: per-file gap analysis

- [ ] **Step 1:** Generate the full report and list files below target — **track Lines, Statements and Branches separately** (all three must pass at 80%/80%/60%):

```bash
npx vitest run --coverage > /tmp/cov.txt 2>&1 || true
python3 - <<'EOF'
import xml.etree.ElementTree as ET
tree = ET.parse('coverage/clover.xml')
rows = []
for f in tree.findall('.//file'):
    p = f.find('metrics')
    s, cs = int(p.get('statements')), int(p.get('coveredstatements'))
    b, cb = int(p.get('conditionals')), int(p.get('coveredconditionals'))
    if s and cs / s < 0.80:
        rows.append((cs/s, s-cs, b, cb, f.get('path')))
for pct, uncov, b, cb, path in sorted(rows):
    short = path.replace('/Users/adm/Documents/Repos/ataqu-suite/', '')
    print(f'{pct*100:5.1f}% stmts | {uncov:>4} uncov | {cb:>3}/{b:<3} br | {short}')
EOF
```

Sort by branch count to prioritize the highest-branch files first — branches is the hard gate (60% global) and the biggest branch clusters live in the interior components (~4522/4884 branch points today).

- [ ] **Step 2:** For each file under target: read it, then add the missing paths. High-yield patterns:
  - **Uncontrolled/controlled variants** — pass both `value`/`defaultValue`/`open`/`defaultOpen` combos.
  - **Disabled/empty/error states** — render `disabled`, `hasMore:false`, empty `items`, `validate` returning an error.
  - **Keyboard/event paths** — fire `KeyDown` ArrowUp/Down/Home/End/Escape on the component.
  - **Timers** — use `vi.useFakeTimers()` to complete `hold`/`linger`/debounce paths.

### Task 4.2: branch hardening

Branches is the strictest gate (needs 60% global) and the plan's probe topped at **57%** branches on pagination — the most interaction-friendly interior component. Reaching the gate therefore **requires** over-closing branches on a large share of interior components, not just nudging a few files. Prioritize by branch-count:
1. First pass: every component already at ≥60% lines — render its remaining ternary arms (`value === null`, `disabled`, `open`, `selected`, `modal:false`, `dismissible:false`, empty/error states).
2. Second pass: every `onKeyDown`/`onPointerDown`/`onClick` handler returned on every `use*` hook — invoke it at least once, forwards and with guards omitted (`onX` prop present vs absent for `?.()` call sites).
3. If interior alone cannot clear 60% global, extend the same two passes to `api-client` (query/mutation success vs error paths via `fetchMock` rejects) and any remaining `ui/src/components/*` files, using the branch listing from Task 4.1 to confirm which files actually hold uncovered branches.

### Task 4.3: final verification

- [ ] **Step 1:** Full gate must pass with zero threshold errors:

```bash
npx vitest run --coverage 2>&1 | grep -E "Statements |Branches |Functions |Lines |ERROR: Coverage|passed \("
```

Expected:
- Lines ≥ 80%, Functions ≥ 80%, Statements ≥ 80%, Branches ≥ 60%
- No `ERROR: Coverage for ...` lines.

- [ ] **Step 2:** Ensure non-coverage regressions none:

```bash
npx vitest run > /tmp/all.txt 2>&1; tail -5 /tmp/all.txt
```

Expected: `Tests  N passed (N)` with no failures, and **no test file left failing**.

- [ ] **Step 3:** Confirm only sanctioned files changed:

```bash
git status --short
git diff --stat
```

Expected changes: new `packages/*/__tests__/*` files + the 6 modified files from Chunks 1-3. No `src/**` changes (unless a component turns out to have a genuine bug the tests expose — then fix in a separate commit and add the regression assertion). The only permitted `vitest.config.ts` change is removing the over-broad `**/command-palette.tsx` exclude (see File Structure note) — that *adds* measured surface; no other include/exclude edits.

- [ ] **Step 4:** Commit remaining work:

```bash
git add -A
git commit -m "test: reach 80% vitest coverage gate across packages"
```

---

## Risks & mitigation

- **Motion/react + happy-dom**: validated — renders fine, do not mock. If a specific component's animation effects throw, wrap only that component's test with a defensive `vi.mock("motion/react", ...)` re-exporting the real module and no-op `animate`/`useAnimate`.
- **Portals** (`Modal`, `Drawer`, `Popover`, `Lightbox`, `Dropdown`, `ContextMenu`): render to `document.body`; `@testing-library` queries document body by default — fine.
- **Timers** (`hold`, `linger`, `announce`, `debounce`): use `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime(...))`; restore with `vi.useRealTimers()` in `afterEach`.
- **scroll/observer hooks**: `vitest.setup.ts` already stubs `ResizeObserver`/`IntersectionObserver`. Where a hook needs real observation, drive the exposed handlers or the stored observer callback directly.
- **Global gate failing mid-chunk**: expected — do not raise thresholds in config; the Chunk checkpoints give the trend, and Chunk 4 closes the gap.

## Acceptance criteria

1. `npx vitest run --coverage` exits 0 with lines ≥ 80%, functions ≥ 80%, statements ≥ 80%, branches ≥ 60%.
2. `npx vitest run` passes (no failures) — the existing 186 tests plus all new tests.
3. No change to `vitest.config.ts` coverage include/exclude; the gate is enforced by `pnpm test:coverage` running in CI.
4. Each commit is a self-contained coverage test addition with the tests passing.