# Design — Ataqu Suite

Premium software, rendered honestly. This document is written from the built
world, not a wish list: every token, shadow, and interaction below is live in
`packages/ui` and cascades to all 10 apps, the auth shell, and the landing page.

Canon anchors: **Craft bar** = Linear, Raycast, Vercel. **Identity accent** =
amber, the brand anchor, used sparingly and always meaningfully. **Language** =
dark-native, with a first-class light method — nothing is "the dark theme" and
"the light theme" bolted on; the whole system is dual-theme by construction.

---

## The theme system

A single token engine in `packages/ui/src/styles.css` renders both themes from
one set of design decisionsainer. No app palette, no per-app overrides.

- **Color primitives** in Oklch, so both themes are perceptually consistent and
  hue-stable when the accent moves. The scale is the same in dark and light;
  only the L (and, at the very bottom of the scale, C) changes.
- **Dual-theme CSS custom properties** (`--background`, `--foreground`,
  `--card`, `--border`, toned `--muted-*`, plus level-of-importance grays).
  Apps write to the tokens, never to literals.
- `theme.ts` (`initTheme` / `onThemeChange`) reads a preference, applies the
  correct token set to `<html>`, and flips it live. Storage key `ataqu-theme`;
  dark is the native default; the user's choice is remembered.
- A no-FOUC start: `initTheme()` runs before first render in every app entry,
  so there is no flash of the wrong theme. Optionally lock the theme early via
  a tiny inline script in `index.html` for zero-flash on hard loads.
- Full accessibility: both themes derive every color from a 4.5:1+ contrast
  pass, focus rings are visible in both, and `prefers-reduced-motion` drops the
  motion layer.

### Tokens (excerpt)

| Token            | Dark            | Light           | Used for                         |
| ----------------- | --------------- | --------------- | -------------------------------- |
| `--background`    | near-black      | near-white      | page                             |
| `--foreground`    | high-contrast   | high-contrast   | primary text                     |
| `--card`          | lifted surface  | card            | panels, notepads                 |
| `--border`        | hairline        | hairline        | the 1px "premium edge"           |
| `--primary`       | amber           | amber           | the identity accent              |
| `--muted-foreground` | dimmed       | dimmed          | secondary text                   |
| fonts             | Inter / JetBrains Mono / Unbounded (one set, both modes)               |

### Premium touches that are real

- **Hairline borders** everywhere; the "card edge" is a subpixel line, not a
  drop shadow. Feels precise, like a focused app.
- **Layered shadows** on heads-up surfaces only (avatars, dialogs, dropdowns),
  never on walls. The resting UI is flat; elevation is earned.
- **`focus-visible` rings**, `hover:-translate-y-*` on interactive affordance,
  `active:scale-[0.98]` on buttons — motion that answers the hand.
- **Amber is directional**: CTAs, the active nav state, the brand mark. Not
  painted across the chrome.

---

## App chrome (packages/ui — the `Shell`)

```
┌───────────────────────────────────────────────────────────────┐
│ ◆   breadcrumbs          search ⌘K            ★ status  ◐ theme │   topbar
├─────────────────────────────────────────────┬─────────────────┤
│  ●   [nav]                                 │                 │
│  ●   [extra sidebar]                        │   content       │
│  ·   [bottom nav: settings/help]            │                 │
└─────────────────────────────────────────────┴─────────────────┘
```

One `Shell` powers every SPA: a slim sidebar (per-app nav + shared slots for
deep-linking and utility entry points), a topbar with breadcrumb-backed
navigation, a ⌘K command palette, a status row, a changelog bell, and the theme
toggle. Runs the color tokens above, so the chrome is dual-theme by default.

---

## Landing

The marketing surface carries the same tokens and the same amber. Dark-native
hero, Lightbox proof-of-architecture, an "escape hatch" with no-lock-in copy, a
premium waitlist. No separate idea of "landing colors" — it reuses the shared
token sets so the whole suite, apps and marketing, feels like one product made
by one team.

---

## Design rules (the short contract)

1. **Write to tokens, never literals.** If you are tempted to type a hex color
   or a gray, you are misusing the system. The token exists; use it.
2. **Amber accent is earned.** One strong use per view. Don't multicolor.
3. **Dark-native, light-able.** Every view is built and checked in both modes.
4. **Hairline, not shadow, for containers.** Shadow only where the eye must
   lift (popovers, dialogs, drpdwrwn).
5. **Motion is an answer.** Hover/active/focus-visible transitions are fast
   (100–200ms) and only where the hand asks.

---

## Maintaining it

- Tokens live only in `packages/ui/src/styles.css`. Change a value there and
  every app inherits it — that is the entire surface of the system.
- `theme.ts` owns theme state; `theme-toggle.tsx` owns the chrome; `Shell`
  owns layout. Fix a bug where it lives; don't patch the symptom in one app.
- Run `pnpm --filter @ataqu/ui typecheck` (and each app's `typecheck`) after
  touching the engine. Everything else is agriculture: the suite is coherent
  because the tokens are singular.

*Written from the built world. Proven by a clean typecheck across the suite and
a production build of the landing consumer.*
