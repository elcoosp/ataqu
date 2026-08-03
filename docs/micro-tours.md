## OnboardJS Micro-Tours – Research Synthesis & Implementation Specification

---

### Executive Summary

**OnboardJS is your optimal choice** for Ataqu's micro-tours. Unlike traditional "tooltip tour" libraries (Intro.js, Driver.js, Reactour), OnboardJS is a **headless onboarding framework** that handles complex state management, conditional flows, and persistence automatically.

| Library | Type | Best For | Ataqu Fit |
|---------|------|----------|-----------|
| **OnboardJS** | Headless framework | Multi-step, conditional, data-collecting flows | ✅ Perfect |
| **Driver.js** | Popover tour | Simple linear tooltips | ❌ Too limited |
| **Reactour** | Class-based tour | Legacy React projects | ❌ Dated architecture |
| **Intro.js** | jQuery-era tour | Simple linear walkthroughs | ❌ No conditional logic |

---

## 1. OnboardJS: What It Is & Why It Matters

OnboardJS is an **open-source, headless, type-safe JavaScript engine** for orchestrating multi-step user onboarding flows. It separates onboarding **logic** from **UI**, meaning you control exactly what renders while OnboardJS manages:

- Determining the next/previous step
- Managing flow state and context
- Handling conditional navigation and skips
- Data persistence and analytics integration
- Plugin system for extensibility

**Key Insight:** Most "onboarding libraries" are actually tour libraries. They show tooltips. OnboardJS is a **flow framework** – it handles conditional branching, user data collection, and multi-screen experiences.

---

## 2. Competitive Analysis: How the Best Do Onboarding

### Linear – "Anti-Onboarding" (The Benchmark)

Linear gets you from signup to first issue in **60 seconds flat**. No tours, no tooltips. Their philosophy: **constraints teach better than tutorials**.

| Linear Pattern | Why It Works | Ataqu Application |
|----------------|--------------|-------------------|
| 7-step, 60-second flow | Reduces friction to zero | Keep tours ≤3 steps |
| Pre-populated demo data | Models ideal behavior | Pre-fill example deals, channels |
| Empty states with one action | Prevents paralysis | One clear CTA per empty state |
| No role/permission setup | Defers complexity | Show advanced features later |

**Critical lesson:** Linear proves that **the best onboarding is the one users don't notice**.

### Notion – Progressive Disclosure

Notion's onboarding asks users **questions to determine their profile type** and personalizes the experience accordingly. They don't assume users will magically understand everything – they **guide toward real work**.

**Critical lesson:** Personalization beats one-size-fits-all. Ask one question to tailor the experience.

### Slack – Selling the Transformation

Slack's onboarding playbook: **sell the transformation, not the features**. They show what life looks like *after* using Slack (connected team, fewer emails) before showing how to use it.

**Critical lesson:** Start with **why** (the transformation), not **how** (the features).

---

## 3. Product Tour Best Practices (SOTA 2025)

### 3.1 Keep Tours Short

"Keep tours short to avoid user drop-off". A lengthy tour before users can explore causes abandonment.

**Rule:** Maximum 3 steps per micro-tour.

### 3.2 Personalize the Experience

"One-size-fits-all onboarding rarely converts effectively". Use user data (role, plan, actions) to adapt flows in real-time.

**Rule:** Show different tours based on user role (Admin vs. Member).

### 3.3 Make Tours Interactive

"Guide users through real actions instead of just presenting instructions". The tour should **advance when the user completes the action** – not when they click "Next".

**Rule:** Tours advance on action completion, not button clicks.

### 3.4 Offer Tours Contextually, Not Just at Onboarding

"Provide product tours when they're contextually relevant, not just at the beginning". Trigger tours when users interact with a feature for the first time.

**Rule:** Tours trigger on first visit to a view, not all at once.

### 3.5 Give Users Control

"Overall, give users control". Every tour must have a visible **"Skip"** button.

**Rule:** Skip button always visible. Never trap the user.

### 3.6 Focus on Activation, Not Features

"Every step exists to help the user complete a narrowly defined outcome (the activation event)".

**Rule:** Each tour step must map to a specific user action that delivers value.

---

## 4. Ataqu-Specific Implementation Specification

### 4.1 Architecture Decision

**Use OnboardJS** with the following packages:

```bash
npm install @onboardjs/core @onboardjs/react
```

OnboardJS's **headless architecture** means your UI components remain fully under your control – tours will feel native to Ataqu's glassmorphic design, not like a third-party overlay.

### 4.2 Store Configuration

```typescript
// packages/shared-stores/src/onboarding.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  completedTours: Record<string, boolean>;
  markCompleted: (tourId: string) => void;
  isCompleted: (tourId: string) => boolean;
  resetTour: (tourId: string) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedTours: {},
      markCompleted: (tourId) =>
        set((state) => ({
          completedTours: { ...state.completedTours, [tourId]: true },
        })),
      isCompleted: (tourId) => get().completedTours[tourId] || false,
      resetTour: (tourId) =>
        set((state) => {
          const { [tourId]: _, ...rest } = state.completedTours;
          return { completedTours: rest };
        }),
    }),
    { name: 'ataqu-onboarding' }
  )
);
```

### 4.3 Tour Configuration Pattern

Each tour is defined as an array of steps with:

- `id` – Unique identifier (used for persistence)
- `type` – `'tooltip'` | `'modal'` | `'inline'`
- `target` – CSS selector or React ref
- `content` – React component or render function
- `action` – Optional: the user action that advances the tour
- `condition` – Optional: when to show this step

```typescript
// Example: CINQ Kanban tour
export const cinqKanbanTour: OnboardingStep[] = [
  {
    id: 'cinq-kanban-1',
    type: 'tooltip',
    target: '[data-tour="kanban-board"]',
    content: 'This is your revenue engine. No 3-year lock-in, just deals.',
    action: 'view', // Advances when user views the element
  },
  {
    id: 'cinq-kanban-2',
    type: 'tooltip',
    target: '[data-tour="deal-card"]',
    content: 'Drag this to "Won" to trigger native automations across the OS.',
    action: 'drag', // Advances when user drags a card
  },
];
```

### 4.4 The `onboardjs` Wrapper Component

```tsx
// packages/ui/src/components/OnboardTour.tsx
import { useEffect } from 'react';
import { useOnboardingStore } from '@ataqu/shared-stores';
import { useTour } from '@onboardjs/react';

interface OnboardTourProps {
  tourId: string;
  steps: OnboardingStep[];
  children: React.ReactNode;
  className?: string;
}

export function OnboardTour({ tourId, steps, children, className }: OnboardTourProps) {
  const { isCompleted, markCompleted } = useOnboardingStore();
  const completed = isCompleted(tourId);

  const { start, currentStep, isActive } = useTour({
    steps,
    onComplete: () => markCompleted(tourId),
    onSkip: () => markCompleted(tourId),
  });

  useEffect(() => {
    if (!completed && steps.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(start, 300);
      return () => clearTimeout(timer);
    }
  }, [completed, start, steps]);

  if (completed) return <>{children}</>;

  return (
    <div className={className}>
      {children}
      {isActive && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => markCompleted(tourId)}
            className="text-sm text-white/50 hover:text-white transition"
          >
            Skip tour
          </button>
        </div>
      )}
    </div>
  );
}
```

### 4.5 Glassmorphic Styling for Tours

```css
/* packages/ui/src/styles/tour.css */
.onboard-tooltip {
  background: rgba(10, 22, 40, 0.85);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px 20px;
  color: #ffffff;
  max-width: 320px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.onboard-tooltip .step-counter {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 8px;
}

.onboard-highlight {
  box-shadow: 0 0 0 4px #F59E0B;
  border-radius: 8px;
  transition: box-shadow 0.2s ease;
}
```

---

## 5. Per-App Tour Specifications

### CINQ (CRM) – Kanban Tour

| Step | Target | Content | Action |
|------|--------|---------|--------|
| 1 | `[data-tour="kanban-board"]` | "This is your revenue engine. No 3-year lock-in, just deals." | View |
| 2 | `[data-tour="deal-card"]` | "Drag this to 'Won' to trigger native automations across the OS." | Drag |

### DIAL (Chat) – Unified Inbox Tour

| Step | Target | Content | Action |
|------|--------|---------|--------|
| 1 | `[data-tour="context-sidebar"]` | "Support isn't an island. Customer data from CINQ lives right here." | View |
| 2 | `[data-tour="reply-box"]` | "Reply instantly. No Zapier required." | Click |

### PIVOT (Docs) – Database Tour

| Step | Target | Content | Action |
|------|--------|---------|--------|
| 1 | `[data-tour="new-row"]` | "High-density data. No 5-second load times." | Click |
| 2 | `[data-tour="relation-column"]` | "Link natively to CINQ deals. No API keys required." | Click |

### SPARK (Automation) – Workflow Tour

| Step | Target | Content | Action |
|------|--------|---------|--------|
| 1 | `[data-tour="trigger-sidebar"]` | "Zapier charges per task. We charge $0. Pick a trigger." | View |
| 2 | `[data-tour="canvas"]` | "Drag it here. Connect it to an action. You're done." | View |

### VAULT (Inventory) – Stock Tour

| Step | Target | Content | Action |
|------|--------|---------|--------|
| 1 | `[data-tour="stock-display"]` | "Real-time stock. Zero race conditions." | View |
| 2 | `[data-tour="adjust-stock"]` | "Adjust it. The math is protected at the database level. No overselling." | Click |

### PAUSE (HR) – Leave Tour

| Step | Target | Content | Action |
|------|--------|---------|--------|
| 1 | `[data-tour="request-leave"]` | "No payroll bloat. Just leave tracking." | Click |
| 2 | `[data-tour="pending-list"]` | "Approve here, and their system access updates automatically via AEGIS." | View |

### VISTA (Analytics) – Dashboard Tour

| Step | Target | Content | Action |
|------|--------|---------|--------|
| 1 | `[data-tour="kpi-card"]` | "No ETL pipelines. This data is live from CINQ, right now." | View |
| 2 | `[data-tour="sse-indicator"]` | "When a deal closes, this updates in milliseconds. No refresh button needed." | View |

---

## 6. Implementation Checklist

- [ ] Install `@onboardjs/core` and `@onboardjs/react`
- [ ] Create `useOnboardingStore` (Zustand with persistence)
- [ ] Create `OnboardTour` wrapper component
- [ ] Add glassmorphic styles for tooltips
- [ ] Define all per-app tours in config files
- [ ] Wrap each app's root route with `OnboardTour`
- [ ] Add `data-tour` attributes to target elements
- [ ] Test all tours on first visit
- [ ] Verify persistence (tours don't repeat after completion)
- [ ] Verify skip button functionality
- [ ] Confirm tours advance on action, not button click

---

## 7. Key Design Principles (Summary)

| Principle | Application |
|-----------|-------------|
| **3 steps max** | Each tour is a micro-tour, not a marathon |
| **Action-based advancement** | Tours advance when user completes the action |
| **Skip always visible** | Never trap the user |
| **Glassmorphic styling** | Tours feel native to Ataqu |
| **Persistence** | Completed tours never reappear |
| **First-visit only** | Tours trigger only on first visit to a view |
| **Contextual** | Tours appear where they're needed, not all at once |
| **One clear CTA per step** | No secondary options. Just clarity |

---

**Next Step:** Do you want me to write the **full TASK-XXX specification** for implementing OnboardJS micro-tours, ready for your front-end agents?
