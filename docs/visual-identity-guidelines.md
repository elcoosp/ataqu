# 📐 ATAQU VISUAL IDENTITY GUIDELINES — Version 1.1 (Phase 1)
### The Visual Language of the Calm Predator

> **Executive Note:** This document governs the entire visual ecosystem of Ataqu. In 2026, B2B software buyers are blind to generic "SaaS marketing." They are highly sensitive to aesthetics, performance, and trust signals. Our visual identity is not just decoration; it is proof of our engineering competence. If the UI looks slow, bloated, or sloppy, the user will not believe we built a fault-tolerant Rust architecture. Everything must feel sharp, mathematically precise, and ruthlessly fast.

---

## 1. THE VISUAL PHILOSOPHY

### 1.1 The Core Principles
Every pixel at Ataqu must adhere to three unbreakable laws:

1. **Mathematical Precision:** We use strict 8px grid systems and rigid alignment. Nothing is placed by eye. This mirrors our strict database isolation and Rust type-safety.
2. **Zero Bloat:** Just as our backend eradicates bloat and unnecessary complexity, our UI eradicates fluffy drop-shadows, excessive gradients, and useless animations. We use borders and high contrast to define space.
3. **The Calm Predator:** The interface must feel powerful but silent. No jarring color flashes, no annoying notification sounds, no celebratory confetti. It is a tool that works flawlessly in the background.

### 1.2 The Aesthetic Benchmark
Ataqu sits at the intersection of **Developer Tooling** (e.g., Vercel, Linear, GitHub) and **High-Performance Capital Markets Software** (e.g., Bloomberg Terminal). It is dense, dark-mode native, and highly information-rich.

---

## 2. THE LOGO SYSTEM

### 2.1 The Primary Mark
The Ataqu logo is a stylized representation of **Power + Calm**. It consists of a sharp, aggressive geometric form (the attack) perfectly enclosed within a stable, unbroken boundary (the protection).

*   **The Attack:** A leaning triangle/peak pointing strictly forward (Northeast).
*   **The Calm:** A perfect outer circle or hexagon that contains the energy.

### 2.2 Clear Space & Minimum Size
To maintain the predator's presence, the logo requires breathing room.
*   **Clear Space:** The padding around the logo must be exactly `2x` the height of the primary mark. No other element may enter this zone.
*   **Minimum Digital Size:** 32px height. Below this, the sharp angles lose their integrity.
*   **Favicon Size:** A stripped-down version of the "Attack" peak only, optimized for 16x16px. It must be legible on a dark browser tab.

### 2.3 Logo Variations & Unapproved Usages

| Variant | Usage |
|---------|-------|
| **Primary (White on Deep Night Blue)** | Default for landing pages, headers, and dark mode UI. |
| **Reversed (Deep Night Blue on White)** | Used strictly for print, invoices, and light-mode email clients. |
| **Monochrome (Amber on Dark/Black)** | Used for sponsorships, MERCH, and developer evangelism. |

**Strictly Forbidden:**
*   Adding drop-shadows to the logo.
*   Stretching or skewing the aspect ratio.
*   Changing the logo colors outside the approved palette.
*   Placing the logo on low-contrast or busy photographic backgrounds.

---

## 3. COLOR SYSTEM

Our color palette is highly restricted to maintain a serious, enterprise-grade feel. Color is used for function, not decoration.

### 3.1 Primary Palette

| Color | Hex Code | RGB | Role |
|-------|----------|-----|------|
| **Deep Night Blue** | `#0A1628` | `10, 22, 40` | The foundation. Used for backgrounds, sidebars, and primary text on light mode. Represents trust, depth, and seriousness. |
| **Amber/Orange** | `#F59E0B` | `245, 158, 11` | The Attack. Used strictly for primary CTAs, active states, and critical alerts. Draws the eye immediately. |
| **Pure White** | `#FFFFFF` | `255, 255, 255` | Primary text on dark backgrounds. |
| **Carbon Black** | `#000000` | `0, 0, 0` | Primary text on light backgrounds. |
| **Light Gray** | `#F3F4F6` | `243, 244, 246` | Neutral background for light-mode contexts (e.g., documentation, invoices). |

### 3.2 Semantic Colors (UI Feedback)
These colors are used *only* to communicate system status. They must never be used for branding.

| Status | Color | Hex Code | Usage |
|--------|-------|----------|-------|
| **Success** | Emerald | `#10B981` | Confirmation of a successful action (e.g., "Saved.", "Deal won"). |
| **Error** | Crimson | `#EF4444` | Critical failures, validation errors, destructive actions (e.g., "Delete"). |
| **Warning** | Amber | `#F59E0B` | Approaching limits, required attention. |

### 3.3 Accessibility & Contrast
Ataqu strictly adheres to WCAG 2.2 AA standards.
*   **Body Text:** Deep Night Blue on Pure White (16.5:1 contrast ratio). Maximum readability.
*   **CTAs:** Amber text on Deep Night Blue (5.9:1 contrast ratio). Passes AA for large text and UI components.
*   **Never use** Amber text on a White background (fails contrast standards).

---

## 4. TYPOGRAPHY SYSTEM

Typography is the voice of the product. We use a dual-font system that balances aggressive geometry with ultimate legibility.

### 4.1 The Typeface Pairing

| Role | Font | Fallback | Why |
|------|------|----------|-----|
| **Display / Headings** | Unbounded | `system-ui` | A geometric, slightly aggressive sans-serif. It feels modern, structural, and distinct from generic SaaS fonts (like Poppins or Proxima Nova). |
| **Body / UI** | Inter | `system-ui` | Designed specifically for computer screens. Exceptionally legible at 14px and 16px. Neutral and highly functional. |
| **Technical / Code** | JetBrains Mono | `monospace` | Used for architectural specs, code snippets, and data metrics. Reinforces the engineering competence of the brand. |

### 4.2 The Type Scale (Based on 1.250 Major Third Ratio)

| Element | Font / Weight | Size / Line Height | Tracking (Letter Spacing) |
|---------|---------------|--------------------|---------------------------|
| **H1 (Landing)** | Unbounded / Bold | 48px / 56px | -1% |
| **H2 (Section)** | Unbounded / Bold | 32px / 40px | -1% |
| **H3 (Subsection)** | Unbounded / SemiBold | 24px / 32px | 0% |
| **Body Large (Lead)** | Inter / Regular | 18px / 28px | 0% |
| **Body Default** | Inter / Regular | 16px / 24px | 0% |
| **UI Text / Small** | Inter / Medium | 14px / 20px | 0% |
| **Code / Metrics** | JetBrains Mono / Regular | 14px / 20px | 0% |

**Typography Rules:**
*   Never use `justify` alignment. Always left-align text for scanability.
*   Never use italics in marketing copy. Italics are reserved for UI placeholders.
*   Maximum line length for reading: 70 characters.

---

## 5. GRID, SPACING & LAYOUT

The layout system is the skeleton of the brand. It must feel engineered, not designed.

### 5.1 The 8px Base Grid
All margins, padding, and structural dimensions must be multiples of 8.
*   **Micro spacing:** 4px (strictly for icon-to-text padding inside buttons).
*   **Standard spacing:** 8px, 16px, 24px, 32px.
*   **Macro spacing:** 48px, 64px, 96px (for section breaks on landing pages).

### 5.2 Web Layout Grid
*   **Container Width:** 1200px max-width. (Optimized for 1366px+ laptop screens, standard in SMB offices).
*   **Columns:** 12-column grid.
*   **Gutter Width:** 24px.
*   **Side Padding:** 32px on desktop, 16px on mobile.

### 5.3 UI Density Rules
Ataqu is a high-density tool. We do not waste vertical space.
*   **Data Tables (CINQ, VAULT):** Row height strictly `40px`. Allows viewing 20+ records without scrolling.
*   **Forms (SOND, PAUSE):** Input height `36px`. Labels above inputs, never floating.
*   **Sidebars:** Width `240px` expanded, `48px` collapsed (showing only icons).

---

## 6. DEPTH, BORDERS & UI COMPONENTS

Ataqu does not use "fluffy" SaaS aesthetics. There are no 40px blurred drop-shadows.

### 6.1 The Border-First Approach
We separate elements using crisp 1px borders, not shadows.
*   **Dark Mode Border:** `#1E293B` (A lighter shade of Deep Night Blue).
*   **Light Mode Border:** `#E5E7EB` (A slightly darker shade of Light Gray).

### 6.2 Shadow System (Strict)
Shadows are used *only* to indicate elements floating above the primary canvas (e.g., Modals, Popovers, Dropdowns).
*   **Level 1 (Dropdowns):** `0px 4px 12px rgba(0, 0, 0, 0.4)` (Dark mode) / `0px 4px 12px rgba(0, 0, 0, 0.1)` (Light mode).
*   **Level 2 (Modals):** `0px 8px 24px rgba(0, 0, 0, 0.6)` (Dark mode) / `0px 8px 24px rgba(0, 0, 0, 0.15)` (Light mode).
*   **Blur Radius:** Never exceeds 24px. The shadow must feel sharp and structural, like a physical block.

### 6.3 Button Architecture
Buttons must feel heavy and clickable.
*   **Primary CTA:** Amber background (`#F59E0B`), Black text (`#000000`), Weight: SemiBold, Border-radius: `6px`.
*   **Secondary CTA:** Transparent background, 1px solid border (`#1E293B`), White text.
*   **Destructive CTA:** Crimson background (`#EF4444`), White text.
*   **Hover States:** Darken background by 10%. Transition: `150ms ease-out`.

---

## 7. ICONOGRAPHY

Icons must match the geometric, precise nature of the typography and logo.

### 7.1 Style Guidelines
*   **Library:** `Lucide` (open-source, consistent, 1.5px stroke).
*   **Stroke:** Strictly 1.5px. Never 2px (too heavy) or 1px (too thin/fades on non-retina screens).
*   **Corners:** Slightly rounded (2px radius on corners). Not perfectly sharp, not completely circular.
*   **Size:** Standard UI icons are `16x16px` or `20x20px`. Feature icons on landing pages are `24x24px`.

### 7.2 App Iconography (The 10 Apps)
Each of the 10 apps requires a distinct, monochrome icon for the sidebar.
*   PIVOT: A database/node tree icon.
*   DIAL: A speech bubble with a sharp tail.
*   SPARK: A lightning bolt (strictly geometric).
*   *Rule:* App icons must be visually distinct at `16x16px` to prevent user confusion in the sidebar.

---

## 8. MOTION & INTERACTION DESIGN

Motion in Ataqu is used to prove the system is fast. If it janks, the illusion of the "Rust architecture" breaks.

### 8.1 The 150ms Rule
All micro-interactions must resolve in exactly 150ms.
*   Human perception registers anything under 100ms as "instant." 150ms feels responsive but gives the brain a micro-second to register the state change.
*   **Easing:** Strictly `ease-out` for entering elements (modals opening, dropdowns appearing). Strictly `ease-in` for exiting elements. Never use `linear`.

### 8.2 Zero Spinners Policy
Ataqu strictly forbids circular loading spinners. They signal weakness and slow backend queries.
*   **Rule:** Use Optimistic UI. When a user clicks "Save," the button immediately shows a success state, and the data updates locally before the server responds.
*   **Fallback:** If a heavy query is running (e.g., VISTA analytics fetching large data), use a skeleton loader (a pulsing gray block shaped like the chart) or a top-of-screen progress bar.

### 8.3 SSE Invalidation Animation
When the backend pushes an update via Server-Sent Events (e.g., a new chat message in DIAL arrives, or a CINQ deal is updated by another team member), the UI element must fade in the new data over 100ms. It should not "pop" in jarringly.

---

## 9. DATA VISUALIZATION (VISTA)

Charts in Ataqu (VISTA app) must look like a Bloomberg terminal, not a generic dashboard template.

### 9.1 Chart Aesthetics
*   **Chart Type:** Default to line charts for time-series, bar charts for categorical data. Never use pie charts (they are mathematically inferior for quick comparison).
*   **Colors:** Lines and bars must use the Amber primary color (`#F59E0B`) for the primary metric. Secondary metrics use varying opacities of White (e.g., `rgba(255,255,255,0.5)`).
*   **Grid Lines:** Strictly horizontal. 1px solid line at `rgba(255,255,255,0.1)`. No vertical grid lines.
*   **Tooltips:** On hover, display a sharp, bordered tooltip with the exact numerical value in `JetBrains Mono` font. No rounded tooltips.

### 9.2 Density
Dashboards should display high-density data. Do not make charts take up the whole screen. Use the 12-column grid to display 4-6 charts simultaneously for a true "command center" feel.

---

## 10. IMAGERY & PHOTOGRAPHY

Ataqu uses imagery sparingly. We are a software tool, not a lifestyle brand.

### 10.1 The Anti-Stock Rule
We strictly forbid the use of generic SaaS stock photography:
*   No smiling people pointing at laptops.
*   No forced diversity groups sitting on beanbag chairs.
*   No abstract 3D shapes floating in pastel gradients.

### 10.2 Approved Imagery Styles
1. **High-Contrast Product UI:** The primary visual asset is the Ataqu interface itself. Show dark-mode dashboards, dense data tables, and clean architecture diagrams.
2. **Authentic Workspaces:** If people must be shown, use high-contrast, moody photography of real developers/founders working. Deep blues, cinematic lighting, focused expressions. No staged smiles.
3. **Architectural Concrete/Steel:** For abstract backgrounds on landing pages or blog headers, use macro photography of raw materials (brushed steel, dark concrete, sharp glass edges). This reinforces the "infrastructure" and "Rust" mentality.

---

## 11. ACCESSIBILITY & INCLUSIVITY (A11Y)

Accessibility is not a feature; it is a baseline requirement of competent engineering.

### 11.1 Color & Contrast
*   All text must meet WCAG 2.2 AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
*   Color must **never** be the sole indicator of meaning. A red error state must also include an icon and text ("Error: Email invalid"). A green success state must include a checkmark.

### 11.2 Focus States
*   When navigating via keyboard (Tab key), the focus ring must be highly visible.
*   **Style:** 2px solid Amber (`#F59E0B`), with a 2px offset. It must look aggressive and intentional, ensuring the user always knows exactly where they are on the page.

### 11.3 Motion Sensitivity
*   Respect the `prefers-reduced-motion` OS setting. If enabled by the user, all animations must instantly resolve to their final state without transitioning.

---

### FINAL VISUAL DIRECTIVE
Ataqu's visual identity is not decoration; it is a proof of competence. Every design choice—from the 8px grid to the sharp borders—must echo the mathematical precision of our Rust architecture and the calm, predatory confidence of our brand. If a design element does not communicate speed, trust, or power, it is bloat. Eradicate it.
