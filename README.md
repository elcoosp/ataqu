# Ataqu Monorepo

This monorepo contains all 10 Ataqu apps and shared packages.

## Setup

1. Install dependencies: `pnpm install`
2. Generate API client: `pnpm generate:api` (automatically runs on postinstall)
3. Start development servers: `pnpm dev`

## Structure

- `apps/` – each app is an independent SPA
- `packages/` – shared code across apps

## Commands

- `pnpm dev` – run all apps in dev mode
- `pnpm build` – build all apps for production
- `pnpm test` – run unit tests
- `pnpm test:e2e` – run Playwright end-to-end tests
- `pnpm lint` – run Biome
- `pnpm extract` – extract i18n messages
- `pnpm compile` – compile i18n catalogs
- `pnpm generate:api` – regenerate API client from Rust code

## Naming Conventions

- All files: `kebab-case` (except entry points like `vite.config.ts`)
- Git commits: conventional commits (feat, fix, chore, etc.)
