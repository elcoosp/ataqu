# Ataqu Monorepo – Frontend Foundation

## Quick Start

```bash
# Install dependencies
pnpm install

# Start all 10 apps in development mode (each on its own port)
pnpm dev

# Or start a specific app
pnpm --filter @ataqu/app-aegis dev
```

All apps are available at subdomains in production, but locally they run on ports 5173–5182.

The shared UI kit includes the unified Shell, Command Palette, and all shadcn/ui components.

## Tasks Completed

- [x] Monorepo structure (apps/ packages/)
- [x] Shared packages: types, tailwind-config, ui, shared-hooks, shared-utils, shared-stores, shared-schemas, shared-i18n, vite-preset, test-utils
- [x] API client (hand-crafted from Rust handlers)
- [x] 10 app scaffolds with routing, authentication guard, and Shell integration
- [x] i18n with Lingui 6
- [x] Testing setup (Vitest + Playwright)
- [x] CI pipeline (GitHub Actions)
- [x] Documentation

See `packages/*/README.md` for details on each package.
