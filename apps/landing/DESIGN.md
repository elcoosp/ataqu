---
name: Ataqu Landing — Construction Document Set
description: "10 apps, one binary, one price — the site is a set of engineering drawings"
colors:
  paper: "#F4F2EA"
  paper-raised: "#FBFAF5"
  paper-sunken: "#ECE9DE"
  hairline: "#D9D5C9"
  hairline-strong: "#B9B4A5"
  ink: "#22262B"
  ink-strong: "#14171C"
  ink-soft: "#686D75"
  redline: "#D9481F"
  redline-ink: "#B23A12"
  blueprint: "#0F2B4C"
  blueprint-line: "#E8F0F8"
  blueprint-soft: "#9DB8D5"
  stamp: "#276749"
  caution: "#8A6410"
  reject: "#A1361B"
typography:
  display:
    fontFamily: "Archivo (wdth 118%), ui-sans-serif"
    fontSize: "clamp(2.375rem, 5vw, 4.125rem) hero; 1.875–3rem sections"
    fontWeight: 650
    lineHeight: 1.05–1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, ui-sans-serif"
    fontSize: "1rem (0.9375rem in dense UI)"
    fontWeight: 400
    lineHeight: 1.6
    measure: "max 62–68ch"
  meta:
    fontFamily: "Fragment Mono, ui-monospace"
    fontSize: "0.6875rem"
    letterSpacing: "0.08em"
    transform: "uppercase"
  numerals: "tabular-nums in every table, schedule, and price"
  scale:
    - "0.6875rem"
    - "0.75rem"
    - "0.8125rem"
    - "0.875rem"
    - "0.9375rem"
    - "1rem"
    - "1.125rem"
    - "1.25rem"
    - "1.5rem"
    - "1.75rem"
    - "1.875rem"
    - "2.25rem"
    - "3rem"
    - "clamp(2.375rem, 5vw, 4.125rem)"
---

# DESIGN.md — Ataqu Landing (Construction Document Set)

The landing is a set of engineering drawings from a serious works: drafting
paper, graphite ink, one redline accent, one cyanotype plate. The product's
proof is architectural, so the site presents itself as construction
documents — sheets, plates, bills of materials, title blocks.

## World rules

- **The paper is the ground.** `--color-paper` everywhere; `paper-raised` for
  framed plates; `paper-sunken` for quiet bands. No gradients, no glass, no
  glow.
- **Hairlines carry structure.** 1px `hairline` / `hairline-strong` rules
  separate everything; shadows are not used. Plate frames are 1px
  `hairline-strong`.
- **Redline is reserved by law.** `redline` / `redline-ink` appear only on:
  the primary action, key figures ($1,200/mo, the binary in the drawing),
  active/selected states, and defect ticks. Nothing else.
- **One cyanotype plate per page maximum.** `blueprint` ground with
  `blueprint-line` strokes and `blueprint-soft` secondary text (contrast
  ≥ 6.9:1) — used for the architecture proof.
- **Status stamps:** `stamp` (green) = approved/done, `caution` = in
  progress, `reject` = defects/errors. Used as text + 1px borders only.
- **Mono is a tool, not a costume.** `meta` mono is for drawing metadata,
  dimensions, table headers, tabular numerals, timestamps. Never for body
  copy.

## Type ramp

0.6875rem (meta) · 0.875rem (secondary) · 0.9375rem (dense UI) · 1rem (body)
· 1.125–1.25rem (lede) · 1.5–1.75rem (sub-headings) · 1.875–3rem (section
display) · clamp(2.375rem, 5vw, 4.125rem) (hero display). Display uses
Archivo at 118% stretch, weight 650, -0.02em tracking, balanced.

## Components

### Buttons (`.btn`)

- **Primary (the stamp):** `ink-strong` ground, `paper` label, 2px radius,
  1px border; hover fills `redline-ink`; content inherits the button's ink.
- **Secondary:** transparent, 1px `ink` border; hover `paper-raised`.
- Focus: 2px `redline` outline, 2px offset.

### Tables (bill of materials)

Header: `meta` mono uppercase `ink-soft`, 1px `hairline-strong` bottom rule.
Rows: 1px `hairline` rules, tabular numerals, highlighted row = `redline` 5%
wash + `redline-ink` text.

### Plates (`.plate`)

1px `hairline-strong` frame on `paper-raised`. `.plate-grid` adds the 24px
drafting grid **only where an actual drawing sits** (hero sheet). Dark plates
use `blueprint` + `.plate-grid-dark`.

### Forms

`.field`: `paper-raised` ground, 1px `hairline-strong`, 2px radius; focus =
`redline` border + 1px ring. Labels are `meta`. App selector chips are
2px-radius checktags; selected = `redline` wash + `redline-ink`.

### Title block (footer)

The close of every page: PROJECT / SHEET / SCALE / REVISION / STATUS cells,
1px `hairline-strong` gaps, `meta` labels over `meta` values.

## Motion

One authored moment: Sheet 01's strokes extend once on load
(`stroke-dashoffset` draw, staggered `.d1–.d8`, cubic-bezier(0.16,1,0.3,1),
fully disabled under `prefers-reduced-motion`). Everything else is hover and
focus transitions of 120–150ms. No scroll reveals, no marquees, no parallax.

## Named rules

- Cards never nest inside cards; schedules and ruled rows replace card grids.
- No kickers/eyebrows above headings; plate metadata lives in title strips.
- Redline text at small sizes is always `redline-ink` (≥5.3:1); `redline`
  itself is for large figures and graphics (≥3.8:1).
- Secondary text is `ink-soft` (≥4.6:1) — never pure gray.
- Selection, caret, scrollbars, and focus rings are themed from the palette.

## Do's and Don'ts

✅ 8px spacing rhythm; more space above a heading than below. Real numbers
from the product only. Lucide icons at 1.5 stroke. `details`/`summary` for
specifications.

❌ Gradient text, glassmorphism, glow halos, side-stripe borders, emoji
icons, system display faces, fake scarcity counters, engagement gadgets.

**Last Updated:** 2026-11-06 (replacement world, built from code)
