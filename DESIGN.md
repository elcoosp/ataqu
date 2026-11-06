# Design — Ataqu Suite

**The Construction Document Set.** The whole suite is drawn, not decorated:
every screen is a sheet of engineering drawings, set on drafting paper (light)
or a cyanotype plate (dark). This document is written from the built world,
not a wish list: every token, rule, and interaction below is live in
`packages/ui/src/styles.css` and cascades to all 10 apps, the auth sheets, and
the landing page.

Canon anchors: **Craft bar** = the drawing office, not the dashboard template.
**Identity accent** = the redline — a mark you make on a drawing to command
attention — used only for primary truth. **Language** = dual-native: light is
the paper sheet, dark is the cyanotype print; neither is a converted afterthought.

---

## The theme system

A single token engine in `packages/ui/src/styles.css` renders both themes from
one set of design decisions. No per-app palettes, no per-app overrides.

- **Light = drafting paper.** Warm sheet `#F4F2EA`, raised paper `#FBFAF5`,
  sunken paper `#ECE9DE`, graphite ink `#22262B` / `#14171C`, hairlines
  `#D9D5C9` / `#B9B4A5`.
- **Dark = cyanotype plate.** Deep blueprint `#0D2138` ground, plate cards
  `#123156`, drafting lines `#E8F0F8` / `#9DB8D5`, hairlines `#2C4E7E`. Dark is
  the app's native default; the app boots onto the plate.
- **Dual-theme CSS custom properties** (`--background`, `--foreground`,
  `--card`, `--border`, toned `--muted-*`). Apps write to the tokens, never to
  literals.
- **Redline is reserved.** `--primary` is redline `#B23A12` (paper) / `#F0764A`
  (plate) and marks only: the active sheet in the index, key figures, links,
  focus rings, and the hover state of the ink stamp button.
- **Stamps carry semantics.** `--success` is the approval stamp `#276749`
  (bright `#5CB98A` on plate), `--warning` the caution ochre `#8A6410`
  (`#E0B45C`), `--destructive` the reject `#A1361B` (`#E56236`). Switches that
  are ON read as a running stamp: green.
- **Type.** Archivo Variable (expanded cut at 118% for the display voice via
  `font-heading`/`brand-mark`), Fragment Mono for the meta voice (`.meta`:
  mono, 11px, +0.08em, uppercase — sheet codes, labels, legends). Body is
  Archivo at −0.005em.
- **Radii are drafting squares.** 2/3/4/6/8px — sheets have corners.
- `theme.ts` (`initTheme` / `onThemeChange`) reads a preference, applies the
  correct token set to `<html>`, and flips it live. Storage key `ataqu-theme`;
  dark (cyanotype) is the default; the user's choice is remembered, with a
  no-FOUC inline bootstrap in `index.html`.
- Full accessibility: both themes pass 4.5:1 contrast on every text pair
  (verified pair-by-pair), focus rings are redline in both, and
  `prefers-reduced-motion` drops the motion layer.

### Tokens (excerpt)

| Token                | Light (paper)    | Dark (cyanotype) | Used for                          |
| -------------------- | ---------------- | ---------------- | --------------------------------- |
| `--background`       | `#F4F2EA` paper  | `#0D2138` plate  | page                              |
| `--foreground`       | `#22262B` ink    | `#E8F0F8` line   | primary text                      |
| `--card`             | `#FBFAF5` raised | `#123156` plate  | panels, tables, popovers          |
| `--border`           | `#D9D5C9` hair   | `#2C4E7E` hair   | the 1px drafting rule             |
| `--primary`          | `#B23A12` redine | `#F0764A` redine | active truth, key figures, links  |
| `--muted-foreground` | `#686D75` soft   | `#9DB8D5` soft   | secondary text, meta labels       |
| fonts                | Archivo Variable + Fragment Mono (one set, both modes)              |

### Drawing touches that are real

- **Hairline rules everywhere**; containers are bordered sheets, not shadowed
  cards. Elevation is earned only by heads-up surfaces (dialogs, dropdowns,
  the phone drawer).
- **The ink stamp button.** The default `Button` is graphite ink (paper text)
  that turns redline on hover — the workhorse action. Destructive is the
  reject stamp. Redline-solid is nobody's resting state.
- **`.meta` voice** for labels, sheet codes, and legends; `.tnum` for every
  number that lives in a column.
- **Registration marks** (⌖) anchor the wordmark, the auth sheets' corners,
  and the drawing grid; `plate-grid` draws the grid only where an actual
  drawing sits (auth sheets), never behind working tables.
- **App identity is linework**: `app-glyphs.tsx` ships thin-stroke SVG glyphs
  and sheet numbers (AEGIS · SHT 01 … VISTA · SHT 10) shared by the sidebar,
  ⌘K palette, and dashboard set-index. No illustrated bitmaps anywhere.

---

## App chrome (packages/ui — the `Shell`)

```
┌───────────────────────────────────────────────────────────────┐
│ ⌖ ATAQU        AEGIS · SHT 01        ⌘K search  ● NOMINAL  ◐  │  title block
├─────────────────────────────────────────────────┬─────────────┤
│ SHEET INDEX          01 ──────────────────┐     │             │
│ ▍AEGIS                                01 │     │  content    │
│  CINQ … VISTA                          … │     │  (the sheet)│
│ AEGIS · SHT 01 (sub-nav for app in view)  │     │             │
│ [D] Dana Whitfield                        │     │             │
└─────────────────────────────────────────────────┴─────────────┘
```

One `Shell` powers every SPA: the sidebar is the **sheet index** of the set
(numbered apps with line glyphs, redline rule on the active sheet, per-app
sub-nav beneath it), and the header is the **title block** (app name in the
expanded display voice, sheet number, health stamp, ⌘K). Below `md` the index
becomes an off-canvas drawer with a backdrop; the drawer starts closed on
phones and dismisses on navigation. Runs the tokens above, so the chrome is
dual-native by default.

---

## Auth sheets

Login/register render **outside** the shell on a full drawing sheet: faint
grid, corner registration marks, a framed access plate, and the title-block
footer (`ATAQU · CONSTRUCTION DOCUMENT SET — ACCESS · SHT A-00`). Same fields
and flows as before; new paper.

---

## Landing

The marketing surface is the cover sheet of the same set — same paper, same
ink, same redline discipline, its hero drawn as a dimensioned figure. No
separate "landing colors" exist anywhere in the repo.

---

## Design rules (the short contract)

1. **Write to tokens, never literals.** If you are tempted to type a hex color,
   you are misusing the system. The token exists; use it.
2. **Redline is earned.** It marks the active sheet, the key figure, the link,
   and one commanding action per view — never decoration, never a row of it.
3. **Dual-native.** Every view is built and checked on paper and on plate.
4. **Hairline, not shadow, for containers.** Shadow only where the eye must
   lift (popovers, dialogs, the phone drawer).
5. **Mono for metadata, tnum for data.** Labels speak `.meta`; figures align
   in `.tnum`.
6. **Motion is an answer.** Fast (100–200ms), reduced-motion safe, only where
   the hand asks.

---

## Maintaining it

- Tokens live only in `packages/ui/src/styles.css`. Change a value there and
  every app inherits it — that is the entire surface of the system.
- `theme.ts` owns theme state; `theme-toggle.tsx` owns the chrome; `Shell`
  owns layout; `app-glyphs.tsx` owns app identity. Fix a bug where it lives;
  don't patch the symptom in one app.
- Run `pnpm --filter @ataqu/ui typecheck` (and each app's `typecheck`) after
  touching the engine. Everything else is agriculture: the suite is coherent
  because the tokens are singular.

*Written from the built world. Proven by a clean typecheck across the suite,
665 green tests, and a production build of every workspace app.*
