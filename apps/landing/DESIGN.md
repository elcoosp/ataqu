---
name: Ataqu Landing Page
description: "10 apps, one price, zero lock‑in — the Calm Predator"
colors:
  background: "#0A1628"
  foreground: "#F8F9FA"
  primary: "#F59E0B"
  primary-foreground: "#0A1628"
  muted: "#64748B"
  muted-foreground: "#94A3B8"
  card: "#0F1A2E"
  card-foreground: "#F8F9FA"
  border: "#1E2A3A"
  ring: "#F59E0B"
  success: "#10B981"
  error: "#EF4444"
typography:
  display:
    fontFamily: "Unbounded, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  xxl: "64px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "12px 32px"
    fontWeight: 600
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.md}"
    padding: "12px 32px"
    fontWeight: 400
---

# Ataqu Design System

## Overview

The Ataqu landing page embodies the **"Dark Terminal / Command Center"** aesthetic — precise, confident, and slightly aggressive. This visual language mirrors the "Calm Predator" ethos: powerful, silent, and ruthless.

**Key characteristics:**
- Dark‑mode native with Deep Night Blue (`#0A1628`) as the primary background.
- Amber (`#F59E0B`) used sparingly for CTAs, key data points, and active states.
- Typography: Unbounded for bold headings, Inter for clean body copy.
- Border‑based separation rather than fluffy shadows.
- 8px grid system for all spacing.
- High contrast, dense but breathable information density.

## Colors

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#0A1628` | Main canvas, sidebars |
| Foreground | `#F8F9FA` | Primary text on dark backgrounds |
| Primary | `#F59E0B` | CTAs, active states, highlights |
| Primary Foreground | `#0A1628` | Text on primary backgrounds |
| Muted | `#64748B` | Secondary text |
| Muted Foreground | `#94A3B8` | Lighter secondary text |
| Card | `#0F1A2E` | Card backgrounds |
| Card Foreground | `#F8F9FA` | Text on cards |
| Border | `#1E2A3A` | Borders between elements |
| Ring | `#F59E0B` | Focus rings |
| Success | `#10B981` | Success states |
| Error | `#EF4444` | Error states |

### Named Rules
- **Never** use amber text on a white background (fails contrast).
- **Always** use amber only for functional elements (CTAs, highlights), never for decoration.
- **Borders** are always 1px solid `#1E2A3A` in dark mode.

## Typography

| Role | Font | Weight | Size | Line Height | Tracking |
|------|------|--------|------|-------------|----------|
| Display H1 | Unbounded | 700 | `clamp(2.5rem, 7vw, 4.5rem)` | 1.1 | `-0.03em` |
| Heading H2 | Unbounded | 700 | `clamp(2rem, 4vw, 3rem)` | 1.2 | `-0.02em` |
| Heading H3 | Unbounded | 600 | `1.5rem` | 1.3 | 0 |
| Body | Inter | 400 | `1rem` | 1.6 | 0 |
| Small / Label | Inter | 500 | `0.875rem` | 1.4 | 0 |
| Mono | JetBrains Mono | 400 | `0.875rem` | 1.5 | 0 |

### Named Rules
- Never use `justify` alignment.
- Never use italics in marketing copy.
- Body measure: 65‑75 characters per line.

## Layout & Spacing

- **Grid:** 12‑column, 1200px max width, 24px gutter.
- **Spacing scale:** 4px, 8px, 16px, 24px, 32px, 48px, 64px, 96px.
- **Side padding:** 32px on desktop, 16px on mobile.
- **Data density:** Row height 40px for tables, input height 36px.

### Named Rules
- All margins and padding must be multiples of 8px (except icon‑to‑text spacing which is 4px).
- Use `gap` for sibling rhythm.
- Ensure responsive behavior is structural (reorder, collapse, reflow).

## Elevation & Depth

Ataqu uses **borders** for separation, not shadows.

- **Level 0:** Flat backgrounds.
- **Level 1:** 1px solid border (`#1E2A3A`).
- **Level 2 (popovers, modals):** Sharp shadow `0px 4px 12px rgba(0,0,0,0.4)` (dark) / `0px 4px 12px rgba(0,0,0,0.1)` (light). Blur radius never exceeds 24px.

### Named Rules
- No glassmorphism.
- No soft shadows on cards.
- No gradient text.

## Shapes & Corners

- **Buttons, inputs, cards:** `8px` border radius.
- **Pills:** `full` (rounded‑full).
- **Tooltips:** `4px` border radius.

### Named Rules
- Cards are never nested inside other cards.
- Pills are for small controls only.

## Components

### Buttons

**Primary Button**
```
background: #F59E0B
color: #0A1628
padding: 12px 32px
border-radius: 8px
font-weight: 600
hover: opacity 90%
transition: 150ms ease-out
```

**Ghost Button**
```
background: transparent
color: #F8F9FA
border: 1px solid #1E2A3A
padding: 12px 32px
border-radius: 8px
font-weight: 400
hover: background #0F1A2E
```

**Destructive Button**
```
background: #EF4444
color: #FFFFFF
padding: 12px 32px
border-radius: 8px
font-weight: 600
hover: opacity 90%
```

### Cards
- Border: 1px solid `#1E2A3A`
- Background: `#0F1A2E` with 30% opacity (or solid)
- Padding: `16px` (or `24px` for larger cards)
- Border-radius: `8px`
- Transition on hover: background change only (no shadows)

### Forms
- Input height: `36px`
- Label above input (never floating)
- Border: 1px solid `#1E2A3A`
- Focus ring: 2px solid `#F59E0B`, 2px offset
- Placeholder text: `#94A3B8`

### Tables
- Row height: `40px`
- Border: 1px solid `#1E2A3A`
- Header: `#94A3B8`, font-display, text-sm
- Highlight row: `#F59E0B` background at 5% opacity

## Do’s and Don’ts

### ✅ Do’s
- Use the 8px grid for all spacing.
- Use amber for CTAs and key data points.
- Use borders for separation, not shadows.
- Keep dark mode native.
- Use dense data tables (40px row height).
- Respect `prefers-reduced-motion`.
- Use semantic HTML and ARIA labels.
- Provide keyboard focus states (2px amber ring).

### ❌ Don’ts
- Don’t use emojis as icons (use Lucide icons instead).
- Don’t use glassmorphism or soft shadows.
- Don’t use gradient text.
- Don’t use exclamation marks in copy.
- Don’t use full‑page loading spinners (use skeleton loaders).
- Don’t use “seamless”, “robust”, “empower” in copy.
- Don’t use stock photography of smiling people.

---

**Last Updated:** 2026-08-01
