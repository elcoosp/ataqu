# Contributing to Ataqu

## Development Workflow

1. Create a branch: `task-<number>/<description>`
2. Make changes following the conventions.
3. Run quality gates: `pnpm lint && pnpm test && pnpm build`
4. Commit with conventional commit message.
5. Push and create a PR.

## Coding Standards

- Use TypeScript strict mode.
- No `any` – use `unknown` with type narrowing.
- All user-visible strings must use Lingui macros.
- Follow the existing patterns in the codebase.
