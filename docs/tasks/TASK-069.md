# TASK-069: Optimization: Frontend Bundles

## Execution Boundaries
 - `apps/*/vite.config.ts`

## Step-by-Step Implementation Details
 1. Audit all 10 SPAs bundle sizes.\n2. Configure Vite `manualChunks` to split heavy libs (BlockNote, React Flow, Recharts).\n3. Ensure route-level code splitting via dynamic imports.\n4. Ensure all apps build to ≤ 500 KB gzipped.

## Success Criteria & Verification
 - [ ] All 10 apps build < 500 KB gzipped.\n- [ ] No chunk size warnings in Vite.
