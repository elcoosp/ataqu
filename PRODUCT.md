# PRODUCT.md — Ataqu Suite

**Platform:** Web — Rust/PostgreSQL backend, 10 independent SPAs (Vite + React + Tailwind v4) sharing the `@ataqu/ui` design system, plus a Next.js marketing site (`apps/landing`).

## 1. What this is

Ataqu is a unified suite of 10 essential business applications — CRM (cinq), Chat (dial), Docs (pivot), Automation (spark), Scheduling (tempo), Forms (sond), Inventory (vault), HR (pause), Analytics (vista), SSO (aegis) — delivered as independent SPAs on a single Rust/PostgreSQL backend, marketed as "10 apps, one price, zero lock-in."

## 2. The audience scene

SMB operators and technical decision-makers (10–200 people) running the suite from a desk, often under poor ambient light, moving fast between apps all day. The experience must read as a calmer, faster, more trustworthy place to work than a stack of point tools — and feel priced like a pro tool, not a toy.

## 3. Brand commitments (durable)

- **Canon:** the suite executes the premium operational-SaaS canon at the craft bar of **Linear** and **Raycast**: cool layered darks, hairline borders over shadows, tight Inter-grade type, surgical micro-interactions, command-first navigation.
- **Theme:** dark-native with a first-class light theme; both are first-class citizens driven from one token system.
- **Accent:** amber is the single brand accent and stays the anchor. Light mode uses a darker amber for contrast; dark mode keeps the warm amber. No secondary saturated accents for the brand.
- Identities: each of the 10 apps keeps its name, domain, icon, and one-word role ("sso", "crm", "chat", ...).

## 4. Visual authority

The replacement world is governed by the suite `DESIGN.md` at the repo root and the shared token system in `packages/ui/src/styles.css`. The landing site's DESIGN.md is a surface-specific instance of the same world.

## 5. Constraints

- Functions, routes, copy, i18n strings, and behavior are preserved; only the visual world is replaced.
- WCAG 2.2 AA contrast; keyboard navigable with visible focus; respect `prefers-reduced-motion`.
- No stock photography, no emoji-as-icons, no glassmorphism, no gradient text.